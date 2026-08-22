import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { runAdapter } from "../../ingest/pipeline.js";
import { ACTIVE_ADAPTERS } from "../../sources/registry.js";

/**
 * Triggered by Vercel Cron once a day (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET` on cron-triggered requests — checked
 * here so the endpoint can't be used by anyone who finds the URL to hammer
 * ge.globo on demand. CRON_SECRET is unset in local dev (no check, and this
 * route can be curled manually there instead of waiting on a schedule).
 */
export async function cronRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/cron/ingest", async (request, reply) => {
    if (env.CRON_SECRET && request.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    for (const adapter of ACTIVE_ADAPTERS) {
      await runAdapter(adapter);
    }

    return { status: "ok", ranAt: new Date().toISOString() };
  });
}
