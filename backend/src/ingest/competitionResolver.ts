import { normalizeText, slugify } from "@ondevaipassar/shared";

// Raw championship names as seen live from ge.globo's team-agenda endpoint
// (confirmed by fetching several tracked teams — see review.md), mapped to
// our canonical Competition.id (packages/shared/src/competition.ts). ge.globo
// does distinguish "Campeonato Brasileiro" (Série A) from "Campeonato
// Brasileiro Série B" as separate strings — both observed directly.
const COMPETITION_ALIASES: Record<string, string> = {
  "campeonato brasileiro": "brasileirao-serie-a",
  "campeonato brasileiro serie b": "brasileirao-serie-b",
  "campeonato brasileiro serie c": "brasileirao-serie-c",
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
  // Confirmed live from the 4 European clubs with a working per-team agenda
  // (Arsenal, Manchester City, Barcelona, Real Madrid) — "LALIGA" is
  // ge.globo's own raw spelling (all caps, no space), not a typo here.
  "premier league": "premier-league",
  laliga: "la-liga",
  // OneFootball's own spellings, confirmed live across all 20 tracked
  // European clubs' fixture pages. "serie a" is the Italian league here:
  // no Brazilian source produces that exact string (ge.globo, the only
  // caller of this resolver, says "Campeonato Brasileiro" for Série A) —
  // but it IS the collision the serie-a-italiana registry entry warns
  // about, so anything new that resolves competition names from Brazilian
  // free text has to be checked against this line.
  "serie a": "serie-a-italiana",
  "uefa liga dos campeoes": "champions-league",
  "uefa liga europa": "europa-league",
  "dfb-pokal": "dfb-pokal",
  "efl cup": "efl-cup",
  // The other national cups, under both the English/native name and the one a
  // Brazilian outlet uses — OneFootball mixes the two ("DFB-Pokal", but "UEFA
  // Liga dos Campeões"), so neither spelling is safe to assume. None of these
  // has been seen live yet (all are off-season as of this entry).
  "fa cup": "fa-cup",
  "copa da inglaterra": "fa-cup",
  "copa del rey": "copa-del-rey",
  "copa do rei": "copa-del-rey",
  "coppa italia": "coppa-italia",
  "copa da italia": "coppa-italia",
  "coupe de france": "coupe-de-france",
  "copa da franca": "coupe-de-france",
  // "Copa Centro-Oeste" keeps its hyphen through normalizeText, which strips
  // accents and case but not punctuation.
  "copa centro-oeste": "copa-centro-oeste",
  "copa centro oeste": "copa-centro-oeste",
  // National teams. OneFootball writes some of these in English ("Friendlies
  // Women", "CONCACAF Nations League") and some in Portuguese, futnatv in its
  // own style ("UEFA Nations League - A": the letter is the division, one
  // competition for us). The plain name of the senior friendly is the same
  // everywhere.
  "amistosos internacionais": "amistosos-internacionais",
  amistoso: "amistosos-internacionais",
  "friendlies women": "amistosos-internacionais-femininos",
  "amistoso feminino": "amistosos-internacionais-femininos",
  "amistosos internacionais femininos": "amistosos-internacionais-femininos",
  "liga das nacoes uefa": "liga-das-nacoes-uefa",
  "concacaf nations league": "liga-das-nacoes-concacaf",
  "liga das nacoes da concacaf": "liga-das-nacoes-concacaf",
  "copa do mundo": "copa-do-mundo",
  "copa do mundo feminina": "copa-do-mundo-feminina",
  "copa america": "copa-america",
  "copa america feminina": "copa-america-feminina",
  eurocopa: "eurocopa",
  "eurocopa feminina": "eurocopa-feminina",
  "uefa euro": "eurocopa",
};

/** Words that say which confederation runs a qualifying tournament, after normalizeText. Checked in this order: "sul-americana" before "americana"-ish words, and so on. */
const CONFEDERATION_KEYWORDS: { id: string; pattern: RegExp }[] = [
  { id: "conmebol", pattern: /\b(conmebol|sul[- ]americ\w*)\b/ },
  { id: "uefa", pattern: /\b(uefa|europ\w*)\b/ },
  { id: "concacaf", pattern: /\bconcacaf\b/ },
  { id: "caf", pattern: /\b(caf|africa\w*)\b/ },
  { id: "afc", pattern: /\b(afc|asia\w*)\b/ },
  { id: "ofc", pattern: /\b(ofc|oceania)\b/ },
];

/**
 * The World Cup qualifying competition a name stands for, or null when it is
 * not one — or when it is one but names no confederation (a generic
 * "Eliminatórias da Copa" can't be filed under the right logo, and a guess
 * would put a European match under CONMEBOL's). The women's say so in the name.
 */
export function resolveQualifiersId(rawName: string): string | null {
  const normalized = normalizeText(rawName);
  const aboutQualifying = /\belimin\w*|\bqualif\w*/.test(normalized);
  if (!aboutQualifying) return null;
  // "Taça das Nações Africanas, Qualificação" and "Eliminatórias da Eurocopa" are
  // qualifiers too — for other tournaments. A name counts as a WORLD CUP qualifier
  // when it says so, or when it is an "Eliminatórias" that names no other tournament.
  const saysWorldCup = /copa do mundo|world cup|mundial/.test(normalized);
  const otherTournament = /eurocopa|\beuro\b|taca|nacoes|nations|copa america|copa asiatica|copa africana/.test(normalized);
  if (!saysWorldCup && (otherTournament || !/\belimin\w*/.test(normalized))) return null;
  const confederation = CONFEDERATION_KEYWORDS.find(({ pattern }) => pattern.test(normalized));
  if (!confederation) return null;
  return `eliminatorias-copa-do-mundo-${/\bfeminin\w*|\bwomen\b/.test(normalized) ? "feminina-" : ""}${confederation.id}`;
}

/**
 * Names that come in many spellings (a division letter, a confederation, a
 * year), matched by shape rather than listed. Only reached when the exact
 * lookup above found nothing, so a listed name always wins.
 */
const COMPETITION_PATTERNS: { pattern: RegExp; id: string }[] = [
  // "UEFA Nations League - A", "Liga das Nações UEFA - B": every division is one competition here.
  { pattern: /\b(uefa nations league|liga das nacoes (da )?uefa)\b/, id: "liga-das-nacoes-uefa" },
];

/** Resolves a raw championship name to our canonical Competition.id. Unrecognized names get a stable slugified stopgap id rather than being dropped — so a new competition shows up immediately, and promoting it to a registry entry (packages/shared/src/competition.ts) is a pure addition, not a rename. */
export function resolveCompetitionId(rawName: string): string {
  const normalized = normalizeText(rawName);
  return COMPETITION_ALIASES[normalized] ?? resolveQualifiersId(rawName) ?? COMPETITION_PATTERNS.find(({ pattern }) => pattern.test(normalized))?.id ?? slugify(rawName);
}
