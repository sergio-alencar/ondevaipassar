import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { runFutebolInteriorEnrichment } from "../../ingest/futebolInteriorEnrichment.js";
import { runItatiaiaEnrichment } from "../../ingest/itatiaiaEnrichment.js";
import { runMeuguiaEnrichment } from "../../ingest/meuguiaEnrichment.js";
import { runOndeAssistirEnrichment } from "../../ingest/ondeAssistirEnrichment.js";
import { runPremiereEnrichment } from "../../ingest/premiereEnrichment.js";
import { runAdapter } from "../../ingest/pipeline.js";
import { runTudoSobrePaulistaEnrichment } from "../../ingest/tudoSobrePaulistaEnrichment.js";
import { runYoutubeEnrichment } from "../../ingest/youtubeEnrichment.js";
import { ACTIVE_ADAPTERS } from "../../sources/registry.js";

/**
 * Triggered by Vercel Cron once a day (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET` on cron-triggered requests — checked
 * here so the endpoint can't be used by anyone who finds the URL to hammer
 * ge.globo on demand. CRON_SECRET is unset in local dev (no check, and this
 * route can be curled manually there instead of waiting on a schedule).
 */
export async function cronRoutes(app: FastifyInstance): Promise<void> {
  // Single path segment, not "/api/cron/ingest" — Vercel's generated route
  // for api/[...slug].ts on this project only matches one segment after
  // /api/ (confirmed live: its regex is `^/api/([^/]+)$`, anything with an
  // extra "/" 404s at the edge before ever reaching this function).
  app.get("/api/cron-ingest", async (request, reply) => {
    if (env.CRON_SECRET && request.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    for (const adapter of ACTIVE_ADAPTERS) {
      await runAdapter(adapter);
    }
    // All three run after the loop above on purpose: they only attach a
    // broadcast to a match ge.globo already ingested this run, never
    // create one themselves.
    await runYoutubeEnrichment();
    await runPremiereEnrichment();
    await runOndeAssistirEnrichment();
    await runFutebolInteriorEnrichment();
    await runTudoSobrePaulistaEnrichment();
    await runMeuguiaEnrichment();
    await runItatiaiaEnrichment();

    return { status: "ok", ranAt: new Date().toISOString() };
  });
}
