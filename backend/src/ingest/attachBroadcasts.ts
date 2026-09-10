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
  /** Snapshot of the broadcasts table, loaded ONCE per enrichment run and shared across its channels — see removeStaleBroadcasts for why reading it per channel got expensive. */
  allBroadcasts: BroadcastRow[];
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

export interface BroadcastRow {
  id: string;
  matchId: string;
  channelId: string;
  watchUrl: string | null;
  sourceId: string;
}

async function removeStaleBroadcasts(
  sourceId: string,
  channelId: string,
  claimedMatchIds: string[],
  allMatches: MatchCandidate[],
  allBroadcasts: BroadcastRow[],
): Promise<number> {
  const cutoff = new Date(Date.now() + STALE_SAFETY_BUFFER_MS).toISOString();
  const upcomingIds = new Set(allMatches.filter((match) => match.kickoffUtc > cutoff).map((match) => match.id));
  const claimed = new Set(claimedMatchIds);
  const isStale = (row: { matchId: string }): boolean => upcomingIds.has(row.matchId) && !claimed.has(row.matchId);

  // Filtered in memory from a snapshot the caller loaded once. Querying
  // per channel meant two full reads of the broadcasts table for each of
  // ~20 sources, and against a remote database that alone pushed the whole
  // cron past its 60s ceiling.
  //
  // A row of ours on a DIFFERENT channel is a leftover from remapping this
  // source, and goes too: each source writes exactly one channel, so it
  // can't be a current claim. Without this, splitting TNT out of TNT Sports
  // left meuguia's old "tntsports" rows behind, still asserting a YouTube
  // broadcast — invisible to the staleness check, because the MATCH was
  // still claimed, just under the new channel.
  const owned = allBroadcasts.filter(
    (row) => row.sourceId === sourceId && (row.channelId !== channelId || isStale(row)),
  );

  // Rows another source created but that carry a per-match link THIS source
  // wrote (attachBroadcastsFromStreams sets watchUrl on an existing row —
  // sourceId stays with whoever got there first). Deleting those would
  // throw away the other source's own claim, so only the link goes.
  //
  // Real bug: futnatv listed TNT Sports for a Champions League match and
  // created the row; the YouTube enrichment then wrote a link to that
  // channel's Youth League stream onto it. Scoped by sourceId alone, the
  // cleanup couldn't see it, and the site kept sending people to an
  // under-19 match long after the title filter stopped claiming it.
  const borrowed = allBroadcasts
    .filter((row) => row.channelId === channelId && row.sourceId !== sourceId && row.watchUrl !== null)
    .filter(isStale);

  if (owned.length === 0 && borrowed.length === 0) return 0;

  const writes = [
    ...owned.map((row) => db.delete(broadcasts).where(eq(broadcasts.id, row.id))),
    ...borrowed.map((row) => db.update(broadcasts).set({ watchUrl: null }).where(eq(broadcasts.id, row.id))),
  ];
  const [first, ...rest] = writes;
  await db.batch([first, ...rest]);

  for (const row of owned) console.log(`[${sourceId}] removed stale broadcast ${row.id}`);
  for (const row of borrowed) console.log(`[${sourceId}] cleared stale link on ${row.id}`);
  return writes.length;
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
  const { sourceId, channelId, streams, channelLogoUrl, allMatches, allBroadcasts, getWatchUrl } = params;
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

  const removedCount = await removeStaleBroadcasts(sourceId, channelId, matchIds, allMatches, allBroadcasts);

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
