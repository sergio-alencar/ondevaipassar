import type { Team } from "@ondevaipassar/shared";

// import.meta.env.BASE_URL already ends with "/" (e.g. "/ondevaipassar/" in
// prod, "/" in dev) — never prefix these with an extra leading slash, and
// never hardcode the repo name here again (that's the bug being fixed).
const FALLBACK_CREST = `${import.meta.env.BASE_URL}images/icones/escudo-cinza.svg`;

export const fallbackCrestUrl = FALLBACK_CREST;

/**
 * Crest for a tracked team: local asset (fast, no external dependency).
 * For anyone else — a continental opponent, a promoted/relegated club we
 * haven't added yet — there's no slugify-and-guess anymore: the API already
 * hands back the source's own crest URL (sourceCrestUrl) for every
 * contestant, tracked or not, so that's the fallback, with the generic gray
 * shield as the last resort if even that 404s.
 */
export function crestUrl(team: Pick<Team, "crestFile"> | undefined, sourceCrestUrl = ""): string {
  return team ? `${import.meta.env.BASE_URL}images/times/${team.crestFile}` : sourceCrestUrl || FALLBACK_CREST;
}

/**
 * Channel logo: local asset when we have one, else the source-provided logo
 * (e.g. ge TV, which we don't ship local art for). Caller's onError should
 * fall back to sourceLogoUrl once, then hide the image.
 */
export function channelLogoUrl(channelId: string): string {
  return `${import.meta.env.BASE_URL}images/canais/${channelId}.svg`;
}
