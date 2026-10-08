import { normalizeText } from "./text.js";

export type CompetitionType = "national-league" | "national-cup" | "state" | "continental" | "friendly";

export interface Competition {
  id: string;
  displayName: string;
  type: CompetitionType;
  /**
   * No Brazilian clubs play in it — tracked because Brazilian fans follow
   * it, not because it's part of the domestic calendar. Note this is about
   * the CLUBS, not geography: Libertadores and Sul-Americana are full of
   * Brazilian teams and are not foreign; Champions League is.
   *
   * Used to order the digest (see backend/src/digest/digest.ts): on a
   * normal Saturday the European leagues kick off in the morning, so pure
   * chronological order buries Brasileirão under four foreign leagues —
   * backwards for a site whose whole premise is "o jogo do seu time".
   */
  foreign?: boolean;
  /**
   * Compact name for length-constrained surfaces (the X digest, where the
   * full "Campeonato Brasileiro Série A" costs 29 of 280 characters). Only
   * set where it actually buys something — a competition whose displayName
   * is already short just uses that. "Série A" unqualified means the
   * Brazilian one, which is why the Italian league's short name is
   * "Italiano" rather than anything containing "Serie A".
   */
  shortName?: string;
  /**
   * Pins a competition's place in the digest, ahead of anything ordered
   * only by kickoff (lower comes first). Set for the three national men's
   * divisions because a Brazilian reader expects Série A first regardless
   * of what kicks off earliest — on a real Saturday, Série C's 9h match
   * otherwise put it above Série A. Everything else stays chronological:
   * this is a deliberate exception, not a ranking to maintain for every
   * competition.
   */
  priority?: number;
  /**
   * Text printed under the competition's logo on any surface that shows the
   * logo alone (the Instagram carousel cover), for a logo that doesn't say
   * enough by itself. Two different reasons set it:
   * - the logo is a bare symbol with no wordmark (Libertadores Feminina, Copa
   *   do Brasil Feminina) — the caption is the whole name;
   * - the logo is the men's one, wording and all (Supercopa do Brasil) — the
   *   caption is just what tells the women's tournament apart ("Feminina").
   * Most competition art spells its own name and needs neither.
   */
  logoCaption?: string;
}

// Seeded from competition names actually observed coming back from ge.globo's
// team agenda endpoint (one team's agenda already spans several of these in a
// single fetch). Growing this list is just adding a row — see ingest/teamResolver
// for how an unrecognized competition name gets a stopgap id instead of being dropped.
export const COMPETITIONS: Competition[] = [
  { id: "brasileirao-serie-a", displayName: "Campeonato Brasileiro Série A", type: "national-league", shortName: "Série A", priority: 1 },
  { id: "brasileirao-serie-b", displayName: "Campeonato Brasileiro Série B", type: "national-league", shortName: "Série B", priority: 2 },
  { id: "brasileirao-serie-c", displayName: "Campeonato Brasileiro Série C", type: "national-league", shortName: "Série C", priority: 3 },
  { id: "brasileirao-feminino", displayName: "Brasileirão Feminino", type: "national-league", shortName: "Feminino" },
  { id: "copa-do-brasil", displayName: "Copa do Brasil", type: "national-cup" },
  { id: "supercopa-do-brasil-feminina", displayName: "Supercopa do Brasil Feminina", type: "national-cup", shortName: "Supercopa Fem.", logoCaption: "Feminina" },
  { id: "copa-do-brasil-feminina", displayName: "Copa do Brasil Feminina", type: "national-cup", shortName: "Copa do Brasil Fem.", logoCaption: "Copa do Brasil Feminina" },
  { id: "copa-do-nordeste", displayName: "Copa do Nordeste", type: "national-cup" },
  // The two regional cups that sit between the state championships and the
  // national ones. Ids are what slugify() makes of the name a source writes
  // ("Copa Verde" -> "copa-verde"), so a match already filed under the
  // stopgap id is picked up by the registry entry with no migration.
  { id: "copa-verde", displayName: "Copa Verde", type: "national-cup" },
  { id: "copa-centro-oeste", displayName: "Copa Centro-Oeste", type: "national-cup" },
  { id: "supercopa-do-brasil", displayName: "Supercopa do Brasil", type: "national-cup", shortName: "Supercopa" },
  { id: "libertadores", displayName: "Taça Conmebol Libertadores", type: "continental", shortName: "Libertadores" },
  // Não é `foreign`: Corinthians, Palmeiras e Cruzeiro disputam a edição de
  // 2026, então ela ordena junto com as competições brasileiras, igual à
  // Libertadores masculina. O logo é só o símbolo, sem o nome — por isso
  // `logoCaption`: a capa do Instagram escreve o nome embaixo dele.
  { id: "libertadores-feminina", displayName: "Copa Libertadores Feminina", type: "continental", shortName: "Libertadores Fem.", logoCaption: "Copa Libertadores Feminina" },
  { id: "sul-americana", displayName: "Copa Sul-Americana", type: "continental", shortName: "Sul-Americana" },
  { id: "recopa-sul-americana", displayName: "Recopa Sul-Americana", type: "continental", shortName: "Recopa" },
  { id: "copa-intercontinental", displayName: "Copa Intercontinental", type: "continental", shortName: "Intercontinental" },
  { id: "amistosos", displayName: "Amistosos", type: "friendly" },
  { id: "campeonato-carioca", displayName: "Campeonato Carioca", type: "state", shortName: "Carioca" },
  { id: "campeonato-mineiro", displayName: "Campeonato Mineiro", type: "state", shortName: "Mineiro" },
  { id: "campeonato-paulista", displayName: "Campeonato Paulista", type: "state", shortName: "Paulista" },
  { id: "campeonato-gaucho", displayName: "Campeonato Gaúcho", type: "state", shortName: "Gaúcho" },
  { id: "campeonato-baiano", displayName: "Campeonato Baiano", type: "state", shortName: "Baiano" },
  { id: "campeonato-pernambucano", displayName: "Campeonato Pernambucano", type: "state", shortName: "Pernambucano" },
  { id: "campeonato-cearense", displayName: "Campeonato Cearense", type: "state", shortName: "Cearense" },
  // The remaining state championships: all 27 federations feed clubs into Série A-C, and each
  // one missing here would show up on the site under a made-up name.
  { id: "campeonato-paranaense", displayName: "Campeonato Paranaense", type: "state", shortName: "Paranaense" },
  { id: "campeonato-catarinense", displayName: "Campeonato Catarinense", type: "state", shortName: "Catarinense" },
  { id: "campeonato-goiano", displayName: "Campeonato Goiano", type: "state", shortName: "Goiano" },
  { id: "campeonato-paraense", displayName: "Campeonato Paraense", type: "state", shortName: "Paraense" },
  { id: "campeonato-maranhense", displayName: "Campeonato Maranhense", type: "state", shortName: "Maranhense" },
  { id: "campeonato-potiguar", displayName: "Campeonato Potiguar", type: "state", shortName: "Potiguar" },
  { id: "campeonato-paraibano", displayName: "Campeonato Paraibano", type: "state", shortName: "Paraibano" },
  { id: "campeonato-sergipano", displayName: "Campeonato Sergipano", type: "state", shortName: "Sergipano" },
  { id: "campeonato-alagoano", displayName: "Campeonato Alagoano", type: "state", shortName: "Alagoano" },
  { id: "campeonato-capixaba", displayName: "Campeonato Capixaba", type: "state", shortName: "Capixaba" },
  { id: "campeonato-amazonense", displayName: "Campeonato Amazonense", type: "state", shortName: "Amazonense" },
  { id: "campeonato-piauiense", displayName: "Campeonato Piauiense", type: "state", shortName: "Piauiense" },
  { id: "campeonato-brasiliense", displayName: "Campeonato Brasiliense", type: "state", shortName: "Brasiliense" },
  { id: "campeonato-sul-mato-grossense", displayName: "Campeonato Sul-Mato-Grossense", type: "state", shortName: "Sul-Mato-Grossense" },
  { id: "campeonato-mato-grossense", displayName: "Campeonato Mato-Grossense", type: "state", shortName: "Mato-Grossense" },
  { id: "campeonato-tocantinense", displayName: "Campeonato Tocantinense", type: "state", shortName: "Tocantinense" },
  { id: "campeonato-acreano", displayName: "Campeonato Acreano", type: "state", shortName: "Acreano" },
  { id: "campeonato-amapaense", displayName: "Campeonato Amapaense", type: "state", shortName: "Amapaense" },
  { id: "campeonato-rondoniense", displayName: "Campeonato Rondoniense", type: "state", shortName: "Rondoniense" },
  { id: "campeonato-roraimense", displayName: "Campeonato Roraimense", type: "state", shortName: "Roraimense" },
  // A distinct competition from Campeonato Paranaense (both appear
  // separately in ge.globo's own Athletico-PR agenda) — a state cup mixing
  // the state's senior pro clubs against smaller in-state teams, closer in
  // spirit to Copa do Brasil's own early rounds than to a state league.
  { id: "copa-parana", displayName: "Copa Paraná", type: "state" },
  { id: "premier-league", displayName: "Premier League", type: "national-league", foreign: true },
  { id: "la-liga", displayName: "La Liga", type: "national-league", foreign: true },
  { id: "bundesliga", displayName: "Bundesliga", type: "national-league", foreign: true },
  { id: "ligue-1", displayName: "Ligue 1", type: "national-league", foreign: true },
  // "serie-a-italiana", not "serie-a": ge.globo's own competition name for
  // this is genuinely just "Serie A" (Italian spelling, no accent) — nearly
  // identical to Brasileirão's "Série A" and a real collision risk in
  // competitionResolver.ts's free-text alias map if an Italian per-team
  // agenda source is ever added (none is yet — this round-hub source
  // hardcodes competitionId directly, never resolves it from raw text, so
  // the risk doesn't apply here). A distinct id sidesteps it either way.
  { id: "serie-a-italiana", displayName: "Campeonato Italiano", type: "national-league", foreign: true, shortName: "Italiano" },
  // Raw name on ge.globo's own team-agenda pages (confirmed live, Real
  // Madrid's own agenda) is literally "Champions League" — no accent/collision
  // risk with anything else tracked here, unlike the Italian Serie A case above.
  { id: "champions-league", displayName: "Champions League", type: "continental", foreign: true, shortName: "Champions" },
  // Confirmed live on the 20 tracked European clubs' own OneFootball
  // fixture pages (see ingest/onefootballEnrichment.ts) — until that source
  // was added, only the five domestic leagues came through, so these clubs'
  // cup runs simply weren't on the site. Names are the ones Brazilian
  // coverage uses, not literal translations of the local ones.
  { id: "europa-league", displayName: "Liga Europa", type: "continental", foreign: true, shortName: "Liga Europa" },
  { id: "dfb-pokal", displayName: "Copa da Alemanha", type: "national-cup", foreign: true, shortName: "Copa da Alemanha" },
  { id: "efl-cup", displayName: "Copa da Liga Inglesa", type: "national-cup", foreign: true, shortName: "EFL Cup" },
  // The other big national cups of the five leagues the site follows. `foreign`
  // is what orders them with the European competitions instead of ahead of the
  // Brazilian ones, so a cup missing from this list would be sorted above
  // Série A on a day Arsenal plays the FA Cup.
  { id: "fa-cup", displayName: "Copa da Inglaterra", type: "national-cup", foreign: true, shortName: "FA Cup" },
  { id: "copa-del-rey", displayName: "Copa do Rei", type: "national-cup", foreign: true },
  { id: "coppa-italia", displayName: "Copa da Itália", type: "national-cup", foreign: true },
  { id: "coupe-de-france", displayName: "Copa da França", type: "national-cup", foreign: true },
];

export function findCompetitionById(id: string): Competition | undefined {
  return COMPETITIONS.find((competition) => competition.id === id);
}

// Age-group and women's football carry the SAME club names as the senior
// men's game, so a source that mixes categories in one list will hand us a
// pairing that looks identical to a fixture we track. The competition name
// is the only thing separating them.
//
// Real bug this comes from: futnatv listed Bayern de Munique x Bodo/Glimt
// twice on 2026-09-10 — once as "UEFA Youth League" at 11h with a YouTube
// link, once as "Champions League" at 16h — and the youth entry attached
// its under-19 stream to the senior fixture.
const YOUTH_COMPETITION_PATTERNS = [/\byouth\b/, /\bsub[\s-]?\d{2}\b/, /\bu\d{2}\b/, /\bjuniores\b/, /\bjuvenil\b/];
const WOMENS_COMPETITION_PATTERNS = [/\bwsl\b/, /\bnwsl\b/, /\bwomen/, /\bfeminin[ao]\b/];

/** True when this names an age-group competition. Nothing here tracks youth football, so such a name can only ever produce a wrong attach. */
export function isYouthCompetitionName(name: string): boolean {
  const normalized = normalizeText(name);
  return YOUTH_COMPETITION_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** True when this names a women's competition. Unlike youth, this IS tracked — but only through the dedicated Feminino resolver, never the shared men's one. */
export function isWomensCompetitionName(name: string): boolean {
  const normalized = normalizeText(name);
  return WOMENS_COMPETITION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export interface CompetitionGroup<T> {
  id: string;
  name: string;
  foreign: boolean;
  priority: number;
  matches: T[];
}

/**
 * Groups matches by competition, in the order a Brazilian reader expects:
 * competitions with Brazilian clubs before foreign ones (see
 * Competition.foreign); then pinned competitions in their set order
 * (Competition.priority — Série A, B, C); then everything else in the order
 * it first appears, which for a kickoff-sorted list means chronological.
 *
 * Both exceptions came from running this against a real Saturday: European
 * leagues kick off in the morning, so pure chronological order put Premier
 * League, Bundesliga and La Liga above Brasileirão; and within the Brazilian
 * block, Série C's 9h match put it above Série A.
 *
 * Lives here, not in the digest, because the site's "Jogos de hoje" needs the
 * exact same order — two copies of this rule would drift.
 */
export function groupMatchesByCompetition<T extends { competitionId: string; competitionName: string }>(
  matches: T[],
): CompetitionGroup<T>[] {
  const groups = new Map<string, CompetitionGroup<T>>();
  for (const match of matches) {
    const competition = findCompetitionById(match.competitionId);
    const group = groups.get(match.competitionId) ?? {
      id: match.competitionId,
      name: match.competitionName,
      foreign: competition?.foreign === true,
      // Unpinned competitions keep the order they first appear in, which
      // (the list being sorted by kickoff) means chronological.
      priority: competition?.priority ?? Number.MAX_SAFE_INTEGER,
      matches: [],
    };
    group.matches.push(match);
    groups.set(match.competitionId, group);
  }

  // Array#sort is stable per spec, so same-priority groups keep the
  // chronological order they were inserted in.
  const byPriority = (toSort: CompetitionGroup<T>[]): CompetitionGroup<T>[] => [...toSort].sort((a, b) => a.priority - b.priority);
  const ordered = [...groups.values()];
  return [...byPriority(ordered.filter((group) => !group.foreign)), ...byPriority(ordered.filter((group) => group.foreign))];
}

const LOWERCASE_WORDS = new Set(["de", "da", "do", "das", "dos", "e"]);

/**
 * A readable name for a competition that has no registry entry yet, made from
 * the id a source's raw name was slugified into ("campeonato-paranaense" ->
 * "Campeonato Paranaense"). Without it the site printed the slug itself,
 * hyphens and all, for every competition the ingest found before anyone
 * registered it. The accents are already gone from a slug, so "Copa Parana"
 * rather than "Copa Paraná" — which is the cue that the competition wants a
 * registry entry.
 */
export function humanizeCompetitionId(id: string): string {
  return id
    .split("-")
    .filter((word) => word !== "")
    .map((word, index) => (index > 0 && LOWERCASE_WORDS.has(word) ? word : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}
