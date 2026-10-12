import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { broadcasts } from "../db/schema.js";

/**
 * Same buffer, same reason as attachBroadcasts.ts's STALE_SAFETY_BUFFER_MS: a
 * match about to start or already under way is never touched, so a listing
 * that changes shape as kickoff approaches can't pull a channel away exactly
 * when viewers need it.
 */
const SAFETY_BUFFER_MS = 3 * 60 * 60 * 1000;

export interface OwnedRow {
  id: string;
  matchId: string;
  channelId: string;
  sourceId: string;
}

export interface Claim {
  matchId: string;
  channelId: string;
}

/**
 * Rows `sourceId` wrote itself for a match it just resolved, on a channel it no
 * longer names. The futnatv enrichments only ever upserted, so a game whose
 * channel changed (the usual case: "Globo" replaced by "SporTV", or a stream
 * moved to another service) kept the old channel on the site until someone
 * deleted the row by hand.
 *
 * Narrow on purpose, so a bad parse can't wipe good data:
 * - only matches this run resolved (`claims` has at least one channel for it) —
 *   a match the source didn't mention, or mentioned with no recognised channel,
 *   is left alone, because silence isn't a correction;
 * - only rows this source created — another source's claim on the same match
 *   is never ours to remove;
 * - only matches at least SAFETY_BUFFER_MS away.
 */
export function findStaleOwnedBroadcasts(
  sourceId: string,
  claims: Claim[],
  existing: OwnedRow[],
  kickoffByMatchId: ReadonlyMap<string, string>,
  now: number = Date.now(),
): string[] {
  const cutoff = new Date(now + SAFETY_BUFFER_MS).toISOString();
  const claimedByMatch = new Map<string, Set<string>>();
  for (const { matchId, channelId } of claims) {
    const channels = claimedByMatch.get(matchId) ?? new Set<string>();
    channels.add(channelId);
    claimedByMatch.set(matchId, channels);
  }

  return existing
    .filter((row) => {
      if (row.sourceId !== sourceId) return false;
      const claimed = claimedByMatch.get(row.matchId);
      if (!claimed || claimed.has(row.channelId)) return false;
      const kickoff = kickoffByMatchId.get(row.matchId);
      return kickoff !== undefined && kickoff > cutoff;
    })
    .map((row) => row.id);
}

/** Reads the rows of the matches in `claims` and returns the delete statements for the stale ones (to go in the caller's own batch). */
export async function staleBroadcastDeletes(
  sourceId: string,
  claims: Claim[],
  kickoffByMatchId: ReadonlyMap<string, string>,
) {
  const matchIds = [...new Set(claims.map((claim) => claim.matchId))];
  if (matchIds.length === 0) return [];
  const existing = await db.select().from(broadcasts).where(inArray(broadcasts.matchId, matchIds));
  const staleIds = findStaleOwnedBroadcasts(sourceId, claims, existing, kickoffByMatchId);
  for (const id of staleIds) console.log(`[${sourceId}] removing stale broadcast ${id}`);
  return staleIds.map((id) => db.delete(broadcasts).where(eq(broadcasts.id, id)));
}
