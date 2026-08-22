import { slugify, type Team } from "@ondevaipassar/shared";

// import.meta.env.BASE_URL already ends with "/" (e.g. "/ondevaipassar/" in
// prod, "/" in dev) — never prefix these with an extra leading slash, and
// never hardcode the repo name here again (that's the bug being fixed).
const FALLBACK_CREST = `${import.meta.env.BASE_URL}images/icones/escudo-cinza.svg`;

export function crestUrl(team: Pick<Team, "crestFile"> | undefined): string {
  return team ? `${import.meta.env.BASE_URL}images/times/${team.crestFile}` : FALLBACK_CREST;
}

export const fallbackCrestUrl = FALLBACK_CREST;

/**
 * Best-effort local crest lookup for an opponent that isn't in our tracked
 * registry (e.g. a continental club) — public/images/times/ already has
 * crests for many of those. Callers should fall back to fallbackCrestUrl
 * via onError if the guess misses.
 */
export function crestUrlForRawName(rawName: string): string {
  return `${import.meta.env.BASE_URL}images/times/${slugify(rawName, "_")}.svg`;
}

export function channelLogoUrl(channelId: string): string {
  return `${import.meta.env.BASE_URL}images/canais/${channelId}.svg`;
}
