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

/**
 * Routes a hotlinked crest URL (an untracked opponent's, straight from
 * ge.globo — the only case TeamCrest ever falls back to this for) through
 * our own backend instead of using it directly. ge.globo's crest SVGs
 * declare a square canvas regardless of the real silhouette drawn inside
 * (a shield-shaped crest sits centered in it with real padding), the same
 * problem already fixed for local crest art by cropping the file — this
 * proxy applies that same crop server-side, since we don't control or want
 * to permanently store every foreign club's art locally just to crop it
 * once. See backend/src/api/routes/crestProxy.ts.
 */
export function crestProxyUrl(sourceUrl: string): string {
  return `${import.meta.env.VITE_API_BASE_URL}/api/crest-proxy?url=${encodeURIComponent(sourceUrl)}`;
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
  bandsports: "jpg",
  canaldobenja: "png",
  cazetv: "png",
  dazn: "png",
  disneyplus: "png",
  espn: "png",
  fpftv: "jpg",
  getv: "png",
  globo: "png",
  globoplay: "png",
  goat: "png",
  hbomax: "png",
  jovempanesportes: "png",
  nossofutebol: "jpeg",
  nsports: "jpg",
  meutimao: "jpg",
  onefootball: "png",
  paramountplus: "png",
  pluto: "png",
  premiere: "png",
  primevideo: "png",
  record: "png",
  romariotv: "png",
  sbt: "png",
  space: "png",
  sportv: "png",
  tnt: "jpg",
  tntsports: "png",
  tvbrasil: "png",
  tvpalmeiras: "jpg",
  uol: "png",
  uolesporte: "png",
  xsports: "png",
  youtube: "png",
};

// Competition logos for the site, SYMBOL ONLY — the competition's name is
// printed beside them, so a logo that spells it too would say it twice. Files
// live in images/campeonatos/site/, named by competition id, with the empty
// margin cropped off. An explicit map and not a guess from the id: a guessed
// path 404s as a broken image, and an entry here is also the answer to "which
// competitions still need art". A competition with no entry just shows its
// name.
//
// `mono` draws the symbol as a single dark silhouette instead of in its own
// colours. It is for the Brasileirão family, whose yellow and lime vanish on a
// white card, and for white-only artwork. It is NOT a house style applied to
// everything: flattening the Bundesliga turns it into a solid block, and the
// Sul-Americana and Serie A lose the detail that makes them recognisable.
// Série B and C are not mono: their SVGs are pre-recoloured (dark body, white ball), which a mask would flatten.
interface CompetitionLogoSpec {
  file: string;
  mono?: true;
}

const COMPETITION_LOGOS: Record<string, CompetitionLogoSpec> = {
  "brasileirao-serie-a": { file: "brasileirao-serie-a.svg", mono: true },
  "brasileirao-serie-b": { file: "brasileirao-serie-b.svg" },
  "brasileirao-serie-c": { file: "brasileirao-serie-c.svg" },
  "brasileirao-feminino": { file: "brasileirao-feminino.svg", mono: true },
  "copa-do-brasil": { file: "copa-do-brasil.svg" },
  "copa-do-brasil-feminina": { file: "copa-do-brasil-feminina.png" },
  libertadores: { file: "libertadores.svg" },
  "libertadores-feminina": { file: "libertadores-feminina.svg" },
  "sul-americana": { file: "sul-americana.svg" },
  "copa-intercontinental": { file: "copa-intercontinental.svg", mono: true },
  "copa-do-nordeste": { file: "copa-do-nordeste.svg" },
  "premier-league": { file: "premier-league.svg" },
  "la-liga": { file: "la-liga.svg" },
  bundesliga: { file: "bundesliga.svg" },
  "ligue-1": { file: "ligue-1.svg" },
  "serie-a-italiana": { file: "serie-a-italiana.svg" },
  "champions-league": { file: "champions-league.svg" },
  "europa-league": { file: "europa-league.svg" },
  "fa-cup": { file: "fa-cup.svg" },
  "copa-del-rey": { file: "copa-del-rey.svg" },
  "campeonato-mineiro": { file: "campeonato-mineiro.svg" },
  "campeonato-carioca": { file: "campeonato-carioca.svg" },
  "campeonato-paulista": { file: "campeonato-paulista.svg" },
  "campeonato-paranaense": { file: "campeonato-paranaense.svg" },
  // Copa Paraná has no logo of its own; it borrows the federation's.
  "copa-parana": { file: "campeonato-paranaense.svg" },
  "supercopa-do-brasil": { file: "supercopa-do-brasil.svg" },
  "dfb-pokal": { file: "dfb-pokal.svg" },
  "efl-cup": { file: "efl-cup.svg" },
  "coppa-italia": { file: "coppa-italia.svg" },
  "coupe-de-france": { file: "coupe-de-france.svg" },
};

/** A competition's symbol-only logo, or null when we don't have one yet. */
export function competitionLogo(competitionId: string): { url: string; mono: boolean } | null {
  const spec = COMPETITION_LOGOS[competitionId];
  return spec ? { url: `${import.meta.env.BASE_URL}images/campeonatos/site/${spec.file}`, mono: spec.mono === true } : null;
}

/**
 * Channel logo: local asset when we have one, else the source-provided logo
 * (e.g. a brand-new channel we haven't sourced art for). Caller's onError
 * should fall back to sourceLogoUrl once, then hide the image.
 */
export function channelLogoUrl(channelId: string): string {
  const ext = RASTER_EXTENSION[channelId] ?? "svg";
  return `${import.meta.env.BASE_URL}images/canais/${channelId}.${ext}`;
}
