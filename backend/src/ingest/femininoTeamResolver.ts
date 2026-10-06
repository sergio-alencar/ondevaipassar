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

/**
 * Ids of the Brazilian clubs this site follows in women's football — the
 * ones that decide whether a fixture is worth ingesting at all. The
 * FEMININO_EXTERIOR clubs below resolve too, but only to give an opponent an
 * id and a crest: two of them meeting (Colo-Colo x Santa Fé's neighbour, say)
 * is not a match this site is about.
 */
const TRACKED_BRAZILIAN_FEMININO_IDS: ReadonlySet<string> = new Set(
  TEAMS.filter((team) => team.division === "FEMININO").map((team) => team.id),
);

/** True for one of the Brazilian women's clubs we follow, as opposed to an opponent we merely recognise. */
export function isTrackedBrazilianFemininoTeam(teamId: string | null): boolean {
  return teamId !== null && TRACKED_BRAZILIAN_FEMININO_IDS.has(teamId);
}

/**
 * Foreign clubs from the Libertadores Feminina, keyed by punctuation-free
 * lowercase. A separate map with its own squashing, because normalizeText
 * only strips accents and case — "L.D.U. Quito", "Caracas F.C." and
 * "U. de Chile" survive it with their dots, and no source has been seen
 * spelling these yet (the 2026 edition started after this was written), so
 * every plausible form is listed rather than the one guessed spelling.
 *
 * "nacional" is the Uruguayan club here and nowhere else in this project;
 * the Paraguayan and Colombian namesakes don't play this edition. It can
 * only ever matter next to a tracked Brazilian side (see
 * isTrackedBrazilianFemininoTeam), which keeps a stray "Nacional" in some
 * other women's fixture from being ingested on its own.
 */
const FOREIGN_FEMININO_ALIASES: Record<string, string> = {
  "colo colo": "colo_colo_feminino",
  "cd colo colo": "colo_colo_feminino",
  "universidad de chile": "universidad_de_chile_feminino",
  "u de chile": "universidad_de_chile_feminino",
  "univ de chile": "universidad_de_chile_feminino",
  caracas: "caracas_feminino",
  "caracas fc": "caracas_feminino",
  "independiente del valle": "independiente_del_valle_feminino",
  "i del valle": "independiente_del_valle_feminino",
  idv: "independiente_del_valle_feminino",
  belgrano: "belgrano_feminino",
  "ca belgrano": "belgrano_feminino",
  "belgrano de cordoba": "belgrano_feminino",
  universitario: "universitario_feminino",
  "universitario de deportes": "universitario_feminino",
  ldu: "ldu_feminino",
  "ldu de quito": "ldu_feminino",
  "ldu quito": "ldu_feminino",
  "l d u quito": "ldu_feminino",
  "liga de quito": "ldu_feminino",
  "liga deportiva universitaria": "ldu_feminino",
  bolivar: "bolivar_feminino",
  "club bolivar": "bolivar_feminino",
  olimpia: "olimpia_feminino",
  "club olimpia": "olimpia_feminino",
  libertad: "libertad_feminino",
  "club libertad": "libertad_feminino",
  nacional: "nacional_feminino",
  "club nacional": "nacional_feminino",
  "club nacional de football": "nacional_feminino",
};

/**
 * Drops a country tag a source appended to a club name: "Colo-Colo (CHI)",
 * "Nacional (URU)" and "Colo-Colo-CHI". UOL's own schedule writes the first
 * form (and once got the code wrong, "Colo-Colo (COL)"), and its group list
 * the last — so the code can't be trusted, only discarded. Run on the raw
 * text because the hyphenated form is recognised by its UPPERCASE code, which
 * normalisation would erase; hyphen only, never a space, or "Club LDU" would
 * lose its "LDU".
 */
function stripCountryTag(value: string): string {
  return value.replace(/\s*\(([A-Za-z]{2,3})\)\s*$/, "").replace(/-[A-Z]{3}$/, "");
}

/**
 * Lowercase, accent-free, with dots dropped and any other run of punctuation
 * collapsed to one space — so "L.D.U. Quito", "LDU Quito" and "ldu-quito"
 * are one key. Dots are removed rather than spaced because they sit INSIDE
 * abbreviations: "F.C." has to become "fc", not "f c", or it would never
 * meet the alias written the ordinary way.
 */
function squash(value: string): string {
  return normalizeText(value)
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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
  const stripped = rawName.replace(TRAILING_SUFFIX_PATTERN, "");
  const normalized = normalizeText(stripped);
  return (
    NORMALIZED_NAME_TO_FEMININO_ID.get(normalized) ??
    FEMININO_FREE_TEXT_ALIASES[normalized] ??
    FOREIGN_FEMININO_ALIASES[squash(stripCountryTag(stripped))] ??
    null
  );
}
