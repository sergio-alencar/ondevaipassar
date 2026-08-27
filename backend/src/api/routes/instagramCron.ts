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
 * Triggered by Vercel Cron daily, shortly after /api/cron-ingest so the
 * day's matches are already fresh (see vercel.json). Same auth pattern as
 * the ingest cron: Vercel sends `Authorization: Bearer $CRON_SECRET` on
 * cron-triggered requests. Single path segment, not "/api/cron/instagram-post"
 * — see the comment on /api/cron-ingest in cron.ts for why.
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
