import { eq } from "drizzle-orm";
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
  /** Extracts a per-broadcast direct link from the matched stream (e.g. a YouTube video URL for that exact match) — omitted for a source with no such per-stream link (e.g. Premiere's channel-grid schedule), in which case the broadcast falls back to the channel's own officialUrl at render time (see getMatchViews.ts). */
  getWatchUrl?: (stream: T) => string | undefined;
}

/**
 * Deletes rows this source created for matches it no longer claims. Without
 * this, a single bad attach is permanent: the enrichment sources only ever
 * upsert, so correcting the code that produced a wrong row does nothing to
 * the row itself. Real bug it comes from — a ge tv PRÉ-JOGO studio show
 * attached as the broadcast of a match that only aired on Premiere
 * (see sources/youtube/schema.ts's NON_BROADCAST_PATTERNS).
 *
 * Scoped to matches still comfortably in the future, because "not claimed
 * this run" is only trustworthy that far out. These sources read a
 * channel's UPCOMING streams (YouTube's eventType=upcoming), and a stream
 * DROPS OUT of that listing the moment it actually goes live — so close to
 * kickoff, absence means "it started", not "it was wrong", and deleting
 * then would pull the broadcast exactly when viewers need it. The same
 * reasoning covers matches already under way or past: never touched.
 *
 * The buffer is a blunt instrument. The precise version would compare video
 * ids — a row whose stream is still listed but no longer parses as this
 * match is definitively wrong, while a row whose stream simply vanished is
 * ambiguous — but that needs the adapters to surface unparsed streams too,
 * which they currently drop.
 */
const STALE_SAFETY_BUFFER_MS = 3 * 60 * 60 * 1000;

async function removeStaleBroadcasts(sourceId: string, claimedMatchIds: string[], allMatches: MatchCandidate[]): Promise<number> {
  const cutoff = new Date(Date.now() + STALE_SAFETY_BUFFER_MS).toISOString();
  const upcomingIds = new Set(allMatches.filter((match) => match.kickoffUtc > cutoff).map((match) => match.id));
  const claimed = new Set(claimedMatchIds);

  const stale = (await db.select().from(broadcasts).where(eq(broadcasts.sourceId, sourceId))).filter(
    (row) => upcomingIds.has(row.matchId) && !claimed.has(row.matchId),
  );
  if (stale.length === 0) return 0;

  const deletes = stale.map((row) => db.delete(broadcasts).where(eq(broadcasts.id, row.id)));
  const [first, ...rest] = deletes;
  await db.batch([first, ...rest]);
  for (const row of stale) console.log(`[${sourceId}] removed stale broadcast ${row.id}`);
  return stale.length;
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
  const { sourceId, channelId, streams, channelLogoUrl, allMatches, getWatchUrl } = params;
  const startedAt = new Date().toISOString();

  const { matchIds, matchedStreams, unresolvedCount } = matchStreamsToBroadcasts(streams, allMatches);
  const now = new Date().toISOString();

  if (matchIds.length > 0) {
    // No logo/watch link of our own to offer (e.g. Premiere, which has
    // neither a per-run avatar source nor a per-match video url) means
    // nothing to change on an existing row — an empty
    // onConflictDoUpdate({ set: {} }) throws ("No values to set"), so this
    // is a real onConflictDoNothing, not just an update with an empty diff.
    // A match that already has a "premiere" broadcast from ge.globo's own
    // primary detection (same id: `${matchId}__premiere`) correctly keeps
    // that row untouched rather than being overwritten by this
    // supplementary source.
    const upserts = matchIds.map((matchId, index) => {
      const watchUrl = getWatchUrl?.(matchedStreams[index]) ?? null;
      const insert = db.insert(broadcasts).values({
        id: `${matchId}__${channelId}`,
        matchId,
        channelId,
        logoUrl: channelLogoUrl ?? "",
        watchUrl,
        sourceId,
        createdAt: now,
      });

      const updateFields: { logoUrl?: string; watchUrl?: string } = {};
      if (channelLogoUrl) updateFields.logoUrl = channelLogoUrl;
      if (watchUrl) updateFields.watchUrl = watchUrl;

      return Object.keys(updateFields).length > 0
        ? insert.onConflictDoUpdate({ target: broadcasts.id, set: updateFields })
        : insert.onConflictDoNothing({ target: broadcasts.id });
    });
    const [first, ...rest] = upserts;
    await db.batch([first, ...rest]);
  }

  const removedCount = await removeStaleBroadcasts(sourceId, matchIds, allMatches);

  await db.insert(scrapeRuns).values({
    sourceId,
    startedAt,
    finishedAt: new Date().toISOString(),
    status: unresolvedCount === 0 ? "ok" : "partial",
    matchesFound: matchIds.length,
    matchesUnresolved: unresolvedCount,
  });

  console.log(`[${sourceId}] attached ${matchIds.length} broadcasts, removed ${removedCount} stale (${unresolvedCount} unresolved)`);
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
