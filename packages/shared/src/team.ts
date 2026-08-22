export interface TeamAliases {
  /** football-data.org's team name, e.g. "CA Mineiro". Not verified for every team yet. */
  footballDataOrg?: string;
  /**
   * URL slug used by ge.globo.com's team agenda page:
   * https://ge.globo.com/futebol/times/{geGlobo}/agenda-de-jogos-do-{geGlobo}/
   * Verified live (HTTP 200 + matching page title) for every team that has one.
   * `null` means the old codebase's guess was wrong and the real slug is not yet known —
   * do not guess again, look it up before filling in.
   */
  geGlobo: string | null;
}

export interface Team {
  id: string;
  displayName: string;
  color: string;
  crestFile: string;
  tracked: boolean;
  aliases: TeamAliases;
}

// Every geGlobo slug below was verified with a live HTTP request (200 + matching
// page title) while building this registry. Two are intentionally null: the old
// teamConfig.js guessed "sport" and "mirassol-*", all of which 404 today. Rather
// than repeat that mistake with a new guess, they're left unresolved.
export const TEAMS: Team[] = [
  { id: "atletico_mineiro", displayName: "Atlético-MG", color: "black", crestFile: "atletico_mineiro.svg", tracked: true, aliases: { geGlobo: "atletico-mg" } },
  { id: "bahia", displayName: "Bahia", color: "blue-900", crestFile: "bahia.svg", tracked: true, aliases: { geGlobo: "bahia" } },
  { id: "botafogo", displayName: "Botafogo", color: "black", crestFile: "botafogo.svg", tracked: true, aliases: { geGlobo: "botafogo" } },
  { id: "bragantino", displayName: "Bragantino", color: "red-800", crestFile: "bragantino.svg", tracked: true, aliases: { geGlobo: "bragantino" } },
  { id: "ceara", displayName: "Ceará", color: "black", crestFile: "ceara.svg", tracked: true, aliases: { geGlobo: "ceara" } },
  { id: "corinthians", displayName: "Corinthians", color: "black", crestFile: "corinthians.svg", tracked: true, aliases: { geGlobo: "corinthians" } },
  { id: "cruzeiro", displayName: "Cruzeiro", color: "blue-800", crestFile: "cruzeiro.svg", tracked: true, aliases: { geGlobo: "cruzeiro" } },
  { id: "flamengo", displayName: "Flamengo", color: "red-800", crestFile: "flamengo.svg", tracked: true, aliases: { geGlobo: "flamengo" } },
  { id: "fluminense", displayName: "Fluminense", color: "green-900", crestFile: "fluminense.svg", tracked: true, aliases: { geGlobo: "fluminense" } },
  { id: "fortaleza", displayName: "Fortaleza", color: "red-800", crestFile: "fortaleza.svg", tracked: true, aliases: { geGlobo: "fortaleza" } },
  { id: "gremio", displayName: "Grêmio", color: "blue-800", crestFile: "gremio.svg", tracked: true, aliases: { geGlobo: "gremio" } },
  { id: "internacional", displayName: "Internacional", color: "red-800", crestFile: "internacional.svg", tracked: true, aliases: { geGlobo: "internacional" } },
  { id: "juventude", displayName: "Juventude", color: "green-900", crestFile: "juventude.svg", tracked: true, aliases: { geGlobo: "juventude" } },
  { id: "mirassol", displayName: "Mirassol", color: "green-900", crestFile: "mirassol.svg", tracked: true, aliases: { geGlobo: null } },
  { id: "palmeiras", displayName: "Palmeiras", color: "green-900", crestFile: "palmeiras.svg", tracked: true, aliases: { geGlobo: "palmeiras" } },
  { id: "santos", displayName: "Santos", color: "black", crestFile: "santos.svg", tracked: true, aliases: { geGlobo: "santos" } },
  { id: "sao_paulo", displayName: "São Paulo", color: "red-800", crestFile: "sao_paulo.svg", tracked: true, aliases: { geGlobo: "sao-paulo" } },
  { id: "sport_recife", displayName: "Sport", color: "red-800", crestFile: "sport_recife.svg", tracked: true, aliases: { geGlobo: null } },
  { id: "vasco_da_gama", displayName: "Vasco", color: "black", crestFile: "vasco_da_gama.svg", tracked: true, aliases: { geGlobo: "vasco" } },
  { id: "vitoria", displayName: "Vitória", color: "red-800", crestFile: "vitoria.svg", tracked: true, aliases: { geGlobo: "vitoria" } },
];

export function findTeamById(id: string): Team | undefined {
  return TEAMS.find((team) => team.id === id);
}
