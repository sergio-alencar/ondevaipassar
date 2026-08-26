import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { runInstagramPosting } from "../../instagram/poster.js";

const querySchema = z.object({
  // Escape hatch for a controlled single-match test post before trusting
  // the unattended daily run — see poster.ts's RunPostingOptions.
  matchId: z.string().optional(),
});

/**
 * Triggered by Vercel Cron daily, shortly after /api/cron/ingest so the
 * day's matches are already fresh (see vercel.json). Same auth pattern as
 * the ingest cron: Vercel sends `Authorization: Bearer $CRON_SECRET` on
 * cron-triggered requests.
 */
export async function instagramCronRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/cron/instagram-post", async (request, reply) => {
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
}
