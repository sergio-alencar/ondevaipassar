import type { MatchView, Team } from "@ondevaipassar/shared";

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
 * A team-picker view (the home grid, the header dropdown) has no match of
 * its own to pull a source crest from — so borrow one from any already-loaded
 * match this team happens to appear in. Returns undefined if the team hasn't
 * played (or isn't playing soon enough to be in the loaded set) — crestUrl
 * then just falls through to the generic shield, same as before.
 */
export function findSourceCrestUrl(teamId: string, matches: MatchView[]): string | undefined {
  for (const match of matches) {
    if (match.homeTeamId === teamId) return match.homeTeamCrestUrl;
    if (match.awayTeamId === teamId) return match.awayTeamCrestUrl;
  }
  return undefined;
}

/**
 * Channel logo: local asset when we have one, else the source-provided logo
 * (e.g. ge TV, which we don't ship local art for). Caller's onError should
 * fall back to sourceLogoUrl once, then hide the image.
 */
export function channelLogoUrl(channelId: string): string {
  return `${import.meta.env.BASE_URL}images/canais/${channelId}.svg`;
}
