/**
 * What a visitor tells us about themselves: the teams they follow and the
 * channels they can actually watch. Kept as plain ids so the same object lives
 * in the browser's localStorage today and could sit in a user account later
 * without changing shape — signing in is then just a merge of two of these.
 */
export interface Preferences {
  teams: string[];
  channels: string[];
}

export const EMPTY_PREFERENCES: Preferences = { teams: [], channels: [] };

// Not a real limit anyone reaches (there are ~100 teams and ~35 channels);
// it only stops a corrupted or hostile localStorage value from becoming a
// huge array the page then renders.
const MAX_IDS = 500;

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))].slice(0, MAX_IDS);
}

/**
 * Reads a stored value back into Preferences, never throwing: anything
 * missing, malformed or of the wrong shape becomes "no preferences" rather
 * than a broken page. localStorage is user-editable and can hold whatever an
 * older version of the site wrote.
 */
export function parsePreferences(raw: string | null | undefined): Preferences {
  if (!raw) return { teams: [], channels: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { teams: [], channels: [] };
    const record = parsed as Record<string, unknown>;
    return { teams: cleanIds(record.teams), channels: cleanIds(record.channels) };
  } catch {
    return { teams: [], channels: [] };
  }
}

/** The list with `id` added if absent, removed if present. Never mutates. */
export function toggleId(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((existing) => existing !== id) : [...list, id];
}

/**
 * Whether the visitor can watch this broadcast. A free channel counts for
 * everyone — that's what free means here — so someone who ticked nothing
 * still gets the open-TV and YouTube games; a paid one only if they said they
 * have it.
 */
export function canWatchBroadcast(broadcast: { channelId: string; free: boolean }, myChannelIds: readonly string[]): boolean {
  return broadcast.free || myChannelIds.includes(broadcast.channelId);
}

/** True when at least one of the match's broadcasts is watchable by this visitor. A match with no confirmed broadcast is not. */
export function canWatchMatch(broadcasts: readonly { channelId: string; free: boolean }[], myChannelIds: readonly string[]): boolean {
  return broadcasts.some((broadcast) => canWatchBroadcast(broadcast, myChannelIds));
}
