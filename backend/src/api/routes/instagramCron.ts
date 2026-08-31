import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "../../config/env.js";
import { db } from "../../db/client.js";
import { instagramPosts } from "../../db/schema.js";
import { runInstagramPosting } from "../../instagram/poster.js";

const querySchema = z.object({
  // Escape hatch for a controlled single-match test post before trusting
  // the unattended daily run — see poster.ts's RunPostingOptions.
  matchId: z.string().optional(),
});

const resetQuerySchema = z.object({ matchId: z.string() });

/**
 * Triggered from TWO independent places on purpose, both daily, both
 * shortly after /api/cron-ingest so the day's matches are fresh:
 *
 * 1. Vercel Cron itself, 10:05 UTC (see vercel.json) — a single call.
 *    This route's own maxDuration ceiling (60s) means one call can't
 *    reliably post every match on a busy day (real bug: 15 tracked
 *    matches one day, only 7 posted from a single firing), so this alone
 *    isn't enough on its own.
 * 2. A GitHub Actions workflow (.github/workflows/instagram-post.yml),
 *    10:17 UTC — calls this repeatedly until the response says nothing's
 *    left (`skipped: 0`), covering whatever #1 didn't finish.
 *
 * Neither scheduler is fully trustworthy alone: GitHub's own docs call
 * scheduled workflows best-effort (can be delayed or dropped under load —
 * real bug found live: it silently didn't fire at all one morning), and
 * Vercel Cron's single call can't finish a busy day by itself. Together,
 * either one firing is enough to make progress, and calling this route
 * twice (or more) in the same morning is always safe — it's just a normal
 * bearer check against CRON_SECRET, doesn't care who's calling or how
 * many times (see this file's own querySchema for the single-match
 * escape hatch, same auth). Single path segment, not
 * "/api/cron/instagram-post" — see the comment on /api/cron-ingest in
 * cron.ts for why.
 */
export async function instagramCronRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/cron-instagram-post", async (request, reply) => {
    if (env.CRON_SECRET && request.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: "invalid query params", details: parsedQuery.error.flatten() });
    }

    const summary = await runInstagramPosting({ onlyMatchId: parsedQuery.data.matchId });
    return { status: "ok", ranAt: new Date().toISOString(), ...summary };
  });

  // Operator-only escape hatch, not part of the daily flow: clears a
  // match's row from instagram_posts so it's eligible for /api/cron-instagram-post
  // again. Needed when a post went out with bad art (e.g. a missing local
  // crest) — Instagram has no "swap this post's image" API, so recovering
  // means deleting the bad post by hand in the app, then calling this to
  // let the pipeline re-publish a corrected one instead of skipping it as
  // already-done.
  app.get("/api/cron-instagram-reset", async (request, reply) => {
    if (env.CRON_SECRET && request.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    const parsedQuery = resetQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: "invalid query params", details: parsedQuery.error.flatten() });
    }

    await db.delete(instagramPosts).where(eq(instagramPosts.id, parsedQuery.data.matchId));
    return { status: "ok", reset: parsedQuery.data.matchId };
  });
}
