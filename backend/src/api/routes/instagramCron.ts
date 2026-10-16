import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "../../config/env.js";
import { db } from "../../db/client.js";
import { instagramPosts } from "../../db/schema.js";
import { realGraphApiClient } from "../../instagram/graphApiClient.js";
import { getTodaysPostPlans, runInstagramPosting } from "../../instagram/poster.js";

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

  // Today's posts as the poster would make them (captions and image URLs), for the daily e-mail that replaces automatic posting while the account recovers. Read-only.
  app.get("/api/instagram-digest", async (request, reply) => {
    if (env.CRON_SECRET && request.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
      return reply.status(401).send({ error: "unauthorized" });
    }
    return { generatedAt: new Date().toISOString(), posts: await getTodaysPostPlans({ includePosted: (request.query as { includePosted?: string }).includePosted === "true" }) };
  });

  // Does the API take a carousel of N images on THIS account? Creates N media containers and a carousel container
  // from the site's own image, and reports what Instagram answered. It NEVER publishes: the containers expire
  // by themselves and nothing appears on the profile. Operator-only (CRON_SECRET).
  app.get("/api/instagram-probe", async (request, reply) => {
    if (env.CRON_SECRET && request.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
      return reply.status(401).send({ error: "unauthorized" });
    }
    const children = Math.min(20, Math.max(2, Number((request.query as { children?: string }).children ?? 11)));
    // The live site's own image, not PUBLIC_SITE_URL (which is localhost wherever it is not set).
    const imageUrl = "https://ondevaipassar.com/images/og-image.png";
    const childIds: string[] = [];
    try {
      // In batches of 5 so 20 images fit the function's 60 seconds.
      for (let i = 0; i < children; i += 5) {
        const batch = Array.from({ length: Math.min(5, children - i) }, () => realGraphApiClient.createCarouselItem(imageUrl));
        childIds.push(...(await Promise.all(batch)));
      }
      for (let i = 0; i < childIds.length; i += 5) await Promise.all(childIds.slice(i, i + 5).map((id) => realGraphApiClient.pollUntilFinished(id)));
      // The client itself refuses more than INSTAGRAM_MAX_CAROUSEL_ITEMS; the probe asks the API directly instead.
      const params = new URLSearchParams({ media_type: "CAROUSEL", children: childIds.join(","), caption: "probe", access_token: env.INSTAGRAM_ACCESS_TOKEN ?? "" });
      const response = await fetch(`https://graph.instagram.com/v25.0/${env.INSTAGRAM_USER_ID}/media`, { method: "POST", body: params });
      const body = (await response.json()) as Record<string, unknown>;
      return { children, childrenCreated: childIds.length, accepted: response.ok, response: response.ok ? { id: body.id } : body };
    } catch (error) {
      return { children, childrenCreated: childIds.length, accepted: false, error: error instanceof Error ? error.message : String(error) };
    }
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
