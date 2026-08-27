import type { MatchView, Team } from "@ondevaipassar/shared";

// import.meta.env.BASE_URL already ends with "/" (e.g. "/ondevaipassar/" in
// prod, "/" in dev) — never prefix these with an extra leading slash, and
// never hardcode the repo name here again (that's the bug being fixed).
const FALLBACK_CREST = `${import.meta.env.BASE_URL}images/icones/escudo-cinza.svg`;

export const fallbackCrestUrl = FALLBACK_CREST;

/** Local crest asset path for a tracked team — fast, no external dependency, but may 404 if we don't actually have art for this team yet (see TeamCrest's fallback cascade). */
export function localCrestUrl(team: Pick<Team, "crestFile">): string {
  return `${import.meta.env.BASE_URL}images/times/${team.crestFile}`;
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

// Every channel now ships curated square icon art (each channel's real app
// icon or Instagram profile picture) instead of a brand wordmark SVG — see
// packages/shared's Channel history for why. Extension varies per file
// (whatever format it was actually sourced in), and a browser can't probe
// the filesystem the way the backend's channelLogoDataUri does, so it's a
// small lookup instead. Falls back to .svg (the older wordmark art) for any
// channel not in this map yet.
const RASTER_EXTENSION: Record<string, string> = {
  band: "png",
  cazetv: "png",
  disneyplus: "png",
  espn: "png",
  getv: "png",
  globo: "png",
  globoplay: "png",
  goat: "png",
  nossofutebol: "jpeg",
  paramountplus: "png",
  premiere: "png",
  primevideo: "png",
  record: "png",
  sbt: "png",
  sportv: "png",
  tntsports: "png",
  youtube: "png",
};

/**
 * Channel logo: local asset when we have one, else the source-provided logo
 * (e.g. a brand-new channel we haven't sourced art for). Caller's onError
 * should fall back to sourceLogoUrl once, then hide the image.
 */
export function channelLogoUrl(channelId: string): string {
  const ext = RASTER_EXTENSION[channelId] ?? "svg";
  return `${import.meta.env.BASE_URL}images/canais/${channelId}.${ext}`;
}
