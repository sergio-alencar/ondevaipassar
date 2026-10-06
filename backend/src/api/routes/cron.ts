import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { runStagesWithinBudget, type IngestStage } from "../../ingest/budget.js";
import { runChannelMirroring } from "../../ingest/channelMirroring.js";
import { runFemininoEnrichment } from "../../ingest/femininoEnrichment.js";
import { runManualFixtures } from "../../ingest/manualFixtures.js";
import { runFutebolInteriorEnrichment } from "../../ingest/futebolInteriorEnrichment.js";
import { runFutnatvEnrichment } from "../../ingest/futnatvEnrichment.js";
import { runItatiaiaEnrichment } from "../../ingest/itatiaiaEnrichment.js";
import { runMeuguiaEnrichment } from "../../ingest/meuguiaEnrichment.js";
import { runOndeAssistirEnrichment } from "../../ingest/ondeAssistirEnrichment.js";
import { runOnefootballEnrichment } from "../../ingest/onefootballEnrichment.js";
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

    const startedAt = Date.now();

    // Order matters and is never rearranged (see runStagesWithinBudget): each
    // step's comment says what it needs from the ones before it. `needsMs` is
    // set only on the enrichments — an estimate from observed runs, rounded
    // up — so that under time pressure it is the LATE ENRICHMENTS that give
    // way, never the steps that create matches.
    const stages: IngestStage[] = [
      // ge.globo's own adapters: the day's fixtures. Never skipped.
      {
        name: "adapters",
        run: async () => {
          for (const adapter of ACTIVE_ADAPTERS) await runAdapter(adapter);
        },
      },
      // Runs right after ge.globo's own adapters (needs to see what they
      // just found, to dedupe against it) and before every broadcast
      // enrichment below (so a match it creates this run is still eligible
      // to get a broadcast attached in the same pass, e.g. itatiaia/meuguia
      // confirming a channel for a fixture only OneFootball knew about).
      { name: "onefootball", run: runOnefootballEnrichment },
      // Hand-seeded fixtures go in BEFORE the futnatv-fed women's step, which
      // needs to see them to fold its own listing of the same game into the
      // seeded row instead of creating a second one.
      { name: "manual-fixtures", run: runManualFixtures },
      // Same "creates its own matches" reasoning as onefootball above — runs
      // once, self-contained (fixtures + broadcasts from the same futnatv
      // fetch), not part of the "enrichment only" block below.
      { name: "feminino", run: runFemininoEnrichment },
      // Every enrichment below runs last on purpose: they only attach a
      // broadcast to a match some earlier step already ingested this run,
      // never create one themselves.
      { name: "youtube", run: runYoutubeEnrichment, needsMs: 6_000 },
      { name: "premiere", run: runPremiereEnrichment, needsMs: 3_000 },
      { name: "onde-assistir", run: runOndeAssistirEnrichment, needsMs: 14_000 },
      { name: "futebol-interior", run: runFutebolInteriorEnrichment, needsMs: 4_000 },
      { name: "tudo-sobre-paulista", run: runTudoSobrePaulistaEnrichment, needsMs: 4_000 },
      { name: "meuguia", run: runMeuguiaEnrichment, needsMs: 4_000 },
      { name: "itatiaia", run: runItatiaiaEnrichment, needsMs: 4_000 },
      { name: "futnatv", run: runFutnatvEnrichment, needsMs: 3_000 },
      // Runs dead last — mirrors whatever the final "tntsports" state of
      // this whole run turned out to be, from any of the sources above.
      // Near-instant, so it is never skipped.
      { name: "channel-mirroring", run: runChannelMirroring },
    ];

    const { skipped } = await runStagesWithinBudget(stages, startedAt);

    return { status: skipped.length > 0 ? "partial" : "ok", ranAt: new Date().toISOString(), skipped };
  });
}
