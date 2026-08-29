export type CompetitionType = "national-league" | "national-cup" | "state" | "continental" | "friendly";

export interface Competition {
  id: string;
  displayName: string;
  type: CompetitionType;
}

// Seeded from competition names actually observed coming back from ge.globo's
// team agenda endpoint (one team's agenda already spans several of these in a
// single fetch). Growing this list is just adding a row — see ingest/teamResolver
// for how an unrecognized competition name gets a stopgap id instead of being dropped.
export const COMPETITIONS: Competition[] = [
  { id: "brasileirao-serie-a", displayName: "Campeonato Brasileiro Série A", type: "national-league" },
  { id: "brasileirao-serie-b", displayName: "Campeonato Brasileiro Série B", type: "national-league" },
  { id: "brasileirao-serie-c", displayName: "Campeonato Brasileiro Série C", type: "national-league" },
  { id: "brasileirao-feminino", displayName: "Brasileirão Feminino", type: "national-league" },
  { id: "copa-do-brasil", displayName: "Copa do Brasil", type: "national-cup" },
  { id: "copa-do-nordeste", displayName: "Copa do Nordeste", type: "national-cup" },
  { id: "supercopa-do-brasil", displayName: "Supercopa do Brasil", type: "national-cup" },
  { id: "libertadores", displayName: "Taça Conmebol Libertadores", type: "continental" },
  { id: "sul-americana", displayName: "Copa Sul-Americana", type: "continental" },
  { id: "recopa-sul-americana", displayName: "Recopa Sul-Americana", type: "continental" },
  { id: "copa-intercontinental", displayName: "Copa Intercontinental", type: "continental" },
  { id: "amistosos", displayName: "Amistosos", type: "friendly" },
  { id: "campeonato-carioca", displayName: "Campeonato Carioca", type: "state" },
  { id: "campeonato-mineiro", displayName: "Campeonato Mineiro", type: "state" },
  { id: "campeonato-paulista", displayName: "Campeonato Paulista", type: "state" },
  { id: "campeonato-gaucho", displayName: "Campeonato Gaúcho", type: "state" },
  { id: "campeonato-baiano", displayName: "Campeonato Baiano", type: "state" },
  { id: "campeonato-pernambucano", displayName: "Campeonato Pernambucano", type: "state" },
  { id: "campeonato-cearense", displayName: "Campeonato Cearense", type: "state" },
  // A distinct competition from Campeonato Paranaense (both appear
  // separately in ge.globo's own Athletico-PR agenda) — a state cup mixing
  // the state's senior pro clubs against smaller in-state teams, closer in
  // spirit to Copa do Brasil's own early rounds than to a state league.
  { id: "copa-parana", displayName: "Copa Paraná", type: "state" },
  { id: "premier-league", displayName: "Premier League", type: "national-league" },
  { id: "la-liga", displayName: "La Liga", type: "national-league" },
  { id: "bundesliga", displayName: "Bundesliga", type: "national-league" },
  { id: "ligue-1", displayName: "Ligue 1", type: "national-league" },
  // "serie-a-italiana", not "serie-a": ge.globo's own competition name for
  // this is genuinely just "Serie A" (Italian spelling, no accent) — nearly
  // identical to Brasileirão's "Série A" and a real collision risk in
  // competitionResolver.ts's free-text alias map if an Italian per-team
  // agenda source is ever added (none is yet — this round-hub source
  // hardcodes competitionId directly, never resolves it from raw text, so
  // the risk doesn't apply here). A distinct id sidesteps it either way.
  { id: "serie-a-italiana", displayName: "Campeonato Italiano (Serie A)", type: "national-league" },
  // Raw name on ge.globo's own team-agenda pages (confirmed live, Real
  // Madrid's own agenda) is literally "Champions League" — no accent/collision
  // risk with anything else tracked here, unlike the Italian Serie A case above.
  { id: "champions-league", displayName: "Champions League", type: "continental" },
];

export function findCompetitionById(id: string): Competition | undefined {
  return COMPETITIONS.find((competition) => competition.id === id);
}
