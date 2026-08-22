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
];

export function findCompetitionById(id: string): Competition | undefined {
  return COMPETITIONS.find((competition) => competition.id === id);
}
