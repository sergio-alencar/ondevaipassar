import { TEAMS, normalizeText } from "@ondevaipassar/shared";

const NORMALIZED_DISPLAY_NAME_TO_ID = new Map(TEAMS.map((team) => [normalizeText(team.displayName), team.id]));

// Spellings a source uses that don't match our own displayName closely enough
// for the normalize()-and-compare above. This is the ONE place cross-source
// name variance gets resolved — adapters never do their own team matching
// (that's what produced the old codebase's 7 divergent normalization schemes).
const FREE_TEXT_ALIASES: Record<string, string> = {
  "athletic club": "athletic",
  "athletic-mg": "athletic",
  "atletico-mg": "atletico_mineiro",
  "atletico mineiro": "atletico_mineiro",
  "ca mineiro": "atletico_mineiro",
  "rb bragantino": "bragantino",
  "red bull bragantino": "bragantino",
  "ec bahia": "bahia",
  "ec juventude": "juventude",
  "ec vitoria": "vitoria",
  "vasco da gama": "vasco_da_gama",
  "cr vasco da gama": "vasco_da_gama",
  vasco: "vasco_da_gama",
  "sport recife": "sport_recife",
  "sport club do recife": "sport_recife",
  "sc recife": "sport_recife",
  sport: "sport_recife",
  "sao paulo": "sao_paulo",
  "sao paulo fc": "sao_paulo",
  "se palmeiras": "palmeiras",
  "santos fc": "santos",
  "sc corinthians paulista": "corinthians",
  "cruzeiro ec": "cruzeiro",
  "cr flamengo": "flamengo",
  "fluminense fc": "fluminense",
  "fortaleza ec": "fortaleza",
  "gremio fbpa": "gremio",
  "sc internacional": "internacional",
  "ceara sc": "ceara",
  "mirassol fc": "mirassol",
  "botafogo fr": "botafogo",
  "floresta-ce": "floresta",
  // ge.globo's own raw name for this club is "Internazionale" (confirmed
  // live, both the league-hub and Real Madrid/Arsenal's own scheduleTeam
  // data) — displayName is "Inter de Milão" instead since that's the name
  // Brazilian coverage actually uses day to day.
  internazionale: "inter_de_milao",
  "tottenham hotspur": "tottenham",
  // itatiaia.com.br shortens this to just "Leverkusen" in running prose
  // (confirmed live, "Elversberg x Leverkusen: onde assistir") — our own
  // displayName keeps the full "Bayer Leverkusen".
  leverkusen: "bayer_leverkusen",
  psg: "paris_saint_germain",
  // Genuinely ambiguous with "Internacional" (the Brazilian club, also
  // tracked) — resolved this way deliberately: every Brazilian source in
  // this codebase spells that one out in full ("Internacional", never bare
  // "Inter", precisely because it IS ambiguous), while "Inter" bare is the
  // standard colloquial name for Milan's club internationally (confirmed
  // live: OneFootball's own Serie A page uses exactly "Inter", no fuller
  // form). Revisit if a source ever produces bare "Inter" for the
  // Brazilian club specifically.
  inter: "inter_de_milao",
  // OneFootball's own domestic (Séries A/B/C) team names, confirmed live —
  // several add a verbose state/city suffix ge.globo's own displayName
  // never uses.
  "athletico paranaense": "athletico_paranaense",
  "athletic club sjdr mg": "athletic",
  "gremio novorizontino": "novorizontino",
  operario: "operario_pr",
  "sao bernardo fc": "sao_bernardo",
  "amazonas fc am": "amazonas",
  "anapolis fc go": "anapolis",
  barra: "barra_sc",
  "caxias do sul": "caxias",
  "ferroviaria sp": "ferroviaria",
  "floresta ec ce": "floresta",
  "guarani sp": "guarani",
  "internacional de limeira": "inter_de_limeira",
  "maranhao-ma": "maranhao",
  "paysandu sc pa": "paysandu",
  "volta redonda fc": "volta_redonda",
  "ypiranga fc": "ypiranga_rs",
};

/** Resolves a raw team name (as scraped/returned by any source) to our canonical Team.id, or null if unrecognized. Never throws — an unresolved team just means the raw name gets displayed as-is. */
export function resolveTeamId(rawName: string): string | null {
  const normalized = normalizeText(rawName);
  return NORMALIZED_DISPLAY_NAME_TO_ID.get(normalized) ?? FREE_TEXT_ALIASES[normalized] ?? null;
}
