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
};

/** Resolves a raw team name (as scraped/returned by any source) to our canonical Team.id, or null if unrecognized. Never throws — an unresolved team just means the raw name gets displayed as-is. */
export function resolveTeamId(rawName: string): string | null {
  const normalized = normalizeText(rawName);
  return NORMALIZED_DISPLAY_NAME_TO_ID.get(normalized) ?? FREE_TEXT_ALIASES[normalized] ?? null;
}
