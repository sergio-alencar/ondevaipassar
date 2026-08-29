import { normalizeText, TEAMS } from "@ondevaipassar/shared";

// Deliberately SEPARATE from teamResolver.ts's resolveTeamId, and never
// imported by it. Brasileirão Feminino team names collide directly with
// tracked men's clubs — "Flamengo", "Ferroviária" etc. are real club names
// on BOTH sides, so a shared resolver would risk attaching a women's
// fixture's broadcast to the men's team of the same name. Callers must
// already know (from futnatv's own `competition` field, not from the team
// name itself) that they're processing Feminino data before calling this.
const NORMALIZED_NAME_TO_FEMININO_ID = new Map(
  TEAMS.filter((team) => team.division === "FEMININO").map((team) => [normalizeText(team.displayName.replace(/\s*\(Fem\.\)$/, "")), team.id]),
);

// Mirrors a subset of teamResolver.ts's own FREE_TEXT_ALIASES for the same
// real clubs — futnatv draws from the same underlying naming conventions
// for men's and women's football, so a verbose/legal name spotted there
// ("RB Bragantino", "EC Bahia"...) is just as likely to show up here too,
// not confirmed live yet for the Feminino side specifically but cheap
// insurance against the same gap.
const FEMININO_FREE_TEXT_ALIASES: Record<string, string> = {
  "rb bragantino": "bragantino_feminino",
  "red bull bragantino": "bragantino_feminino",
  "ec bahia": "bahia_feminino",
  "sc corinthians paulista": "corinthians_feminino",
  "cr flamengo": "flamengo_feminino",
  "fluminense fc": "fluminense_feminino",
  "gremio fbpa": "gremio_feminino",
  "sc internacional": "internacional_feminino",
  "ec juventude": "juventude_feminino",
  "se palmeiras": "palmeiras_feminino",
  "santos fc": "santos_feminino",
  "sao paulo fc": "sao_paulo_feminino",
  "ec vitoria": "vitoria_feminino",
  "cruzeiro ec": "cruzeiro_feminino",
  "atletico-mg": "atletico_mineiro_feminino",
  "atletico mineiro": "atletico_mineiro_feminino",
  "ca mineiro": "atletico_mineiro_feminino",
};

// futnatv suffixes a Feminino team's name with " F" (or, less often,
// "(F)"/"Fem"/"Feminino") specifically on its own placeholder/draft
// listings — femininoEnrichment.ts already filters those out entirely
// before calling this (see its own isPlaceholderListing), since a
// placeholder's date is often wrong. This stripping stays here as a
// defensive fallback for any suffixed name that reaches this function some
// other way, so it still resolves instead of silently failing.
const TRAILING_SUFFIX_PATTERN = /\s*[([]?\b(f|fem|feminino)\b[)\]]?\s*$/i;

/**
 * Resolves a raw Feminino team name (as scraped by futnatv, currently the
 * only source for this competition) to our own dedicated `_feminino`-
 * suffixed Team.id, or null if unrecognized. Never throws — an unresolved
 * name just means the raw name gets displayed as-is, same contract as
 * teamResolver.ts's resolveTeamId.
 */
export function resolveFemininoTeamId(rawName: string): string | null {
  const normalized = normalizeText(rawName.replace(TRAILING_SUFFIX_PATTERN, ""));
  return NORMALIZED_NAME_TO_FEMININO_ID.get(normalized) ?? FEMININO_FREE_TEXT_ALIASES[normalized] ?? null;
}
