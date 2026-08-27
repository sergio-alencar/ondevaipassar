import { db } from "../db/client.js";
import { broadcasts, scrapeRuns } from "../db/schema.js";
import { getErrorMessage } from "../lib/errors.js";
import { matchStreamsToBroadcasts, type MatchCandidate, type TeamPairStream } from "./broadcastMatching.js";

export interface AttachBroadcastsParams<T extends TeamPairStream> {
  sourceId: string;
  channelId: string;
  streams: T[];
  /** Source-provided logo, or null to leave an existing broadcast row's logoUrl untouched (e.g. no channel avatar found this run). */
  channelLogoUrl: string | null;
  allMatches: MatchCandidate[];
}

/**
 * The DB-writing half every "team pair + rough date from a broadcaster's own
 * channel, no fixtures API" enrichment source shares: match streams against
 * already-ingested matches, upsert a broadcast row for each hit, and record
 * a scrape_runs row. Deliberately doesn't catch its own errors — the caller
 * (which already fetched `streams` over the network, a step that can also
 * fail) wraps both in one try/catch so a whole channel's run gets exactly
 * one scrape_runs row either way, not two independent failure paths for the
 * same run. Matching itself stays in broadcastMatching.ts, pure and DB-free,
 * so it's testable without touching this I/O.
 */
export async function attachBroadcastsFromStreams<T extends TeamPairStream>(
  params: AttachBroadcastsParams<T>,
): Promise<void> {
  const { sourceId, channelId, streams, channelLogoUrl, allMatches } = params;
  const startedAt = new Date().toISOString();

  const { matchIds, unresolvedCount } = matchStreamsToBroadcasts(streams, allMatches);
  const now = new Date().toISOString();

  if (matchIds.length > 0) {
    // No logo of our own to offer (e.g. Premiere, which has no per-run
    // avatar source) means nothing to change on an existing row — an empty
    // onConflictDoUpdate({ set: {} }) throws ("No values to set"), so this
    // is a real onConflictDoNothing, not just an update with an empty diff.
    // A match that already has a "premiere" broadcast from ge.globo's own
    // primary detection (same id: `${matchId}__premiere`) correctly keeps
    // that row untouched rather than being overwritten by this
    // supplementary source.
    const upserts = matchIds.map((matchId) => {
      const insert = db.insert(broadcasts).values({
        id: `${matchId}__${channelId}`,
        matchId,
        channelId,
        logoUrl: channelLogoUrl ?? "",
        sourceId,
        createdAt: now,
      });
      return channelLogoUrl
        ? insert.onConflictDoUpdate({ target: broadcasts.id, set: { logoUrl: channelLogoUrl } })
        : insert.onConflictDoNothing({ target: broadcasts.id });
    });
    const [first, ...rest] = upserts;
    await db.batch([first, ...rest]);
  }

  await db.insert(scrapeRuns).values({
    sourceId,
    startedAt,
    finishedAt: new Date().toISOString(),
    status: unresolvedCount === 0 ? "ok" : "partial",
    matchesFound: matchIds.length,
    matchesUnresolved: unresolvedCount,
  });

  console.log(`[${sourceId}] attached ${matchIds.length} broadcasts (${unresolvedCount} unresolved)`);
}

/** Runs one source end to end (fetch -> attach) and records a "failed" scrape_runs row if either step throws — a source failing never throws past this point, so the next one in a loop still runs. */
export async function runBroadcastSource(sourceId: string, run: () => Promise<void>): Promise<void> {
  const startedAt = new Date().toISOString();
  try {
    await run();
  } catch (error) {
    await db.insert(scrapeRuns).values({
      sourceId,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      matchesFound: 0,
      matchesUnresolved: 0,
      errorMessage: getErrorMessage(error),
    });
    console.error(`[${sourceId}] run failed:`, error);
  }
}
