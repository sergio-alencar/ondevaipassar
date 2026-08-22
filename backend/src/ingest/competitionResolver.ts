import { normalizeText, slugify } from "@ondevaipassar/shared";

// Raw championship names as seen live from ge.globo's team-agenda endpoint
// (confirmed by fetching several tracked teams — see review.md), mapped to
// our canonical Competition.id (packages/shared/src/competition.ts). ge.globo
// does distinguish "Campeonato Brasileiro" (Série A) from "Campeonato
// Brasileiro Série B" as separate strings — both observed directly.
const COMPETITION_ALIASES: Record<string, string> = {
  "campeonato brasileiro": "brasileirao-serie-a",
  "campeonato brasileiro serie b": "brasileirao-serie-b",
  "copa do brasil": "copa-do-brasil",
  "copa do nordeste": "copa-do-nordeste",
  "supercopa do brasil": "supercopa-do-brasil",
  "taca conmebol libertadores": "libertadores",
  "copa conmebol libertadores": "libertadores",
  "copa conmebol sul-americana": "sul-americana",
  "copa sul-americana": "sul-americana",
  "recopa sul-americana": "recopa-sul-americana",
  "copa intercontinental": "copa-intercontinental",
  amistosos: "amistosos",
  "campeonato carioca": "campeonato-carioca",
  "campeonato mineiro": "campeonato-mineiro",
  "campeonato paulista": "campeonato-paulista",
  "campeonato gaucho": "campeonato-gaucho",
  "campeonato baiano": "campeonato-baiano",
  "campeonato pernambucano": "campeonato-pernambucano",
  "campeonato cearense": "campeonato-cearense",
};

/** Resolves a raw championship name to our canonical Competition.id. Unrecognized names get a stable slugified stopgap id rather than being dropped — so a new competition shows up immediately, and promoting it to a registry entry (packages/shared/src/competition.ts) is a pure addition, not a rename. */
export function resolveCompetitionId(rawName: string): string {
  return COMPETITION_ALIASES[normalizeText(rawName)] ?? slugify(rawName);
}
