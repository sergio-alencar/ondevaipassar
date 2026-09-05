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
  { id: "copa-do-nordeste", displayName: "Copa do Nordeste", type: "national-cup" },
  { id: "supercopa-do-brasil", displayName: "Supercopa do Brasil", type: "national-cup", shortName: "Supercopa" },
  { id: "libertadores", displayName: "Taça Conmebol Libertadores", type: "continental", shortName: "Libertadores" },
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
  { id: "serie-a-italiana", displayName: "Campeonato Italiano (Serie A)", type: "national-league", foreign: true, shortName: "Italiano" },
  // Raw name on ge.globo's own team-agenda pages (confirmed live, Real
  // Madrid's own agenda) is literally "Champions League" — no accent/collision
  // risk with anything else tracked here, unlike the Italian Serie A case above.
  { id: "champions-league", displayName: "Champions League", type: "continental", foreign: true, shortName: "Champions" },
];

export function findCompetitionById(id: string): Competition | undefined {
  return COMPETITIONS.find((competition) => competition.id === id);
}
