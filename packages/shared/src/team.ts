export interface TeamAliases {
  /** football-data.org's team name, e.g. "CA Mineiro". Not verified for every team yet. */
  footballDataOrg?: string;
  /**
   * URL slug used by ge.globo.com's team agenda page:
   * https://ge.globo.com/futebol/times/{geGlobo}/agenda-de-jogos-do-{geGlobo}/
   * Verified live (HTTP 200 + matching page title) for every team that has one.
   * `null` means the real slug is not known yet — smaller/regional clubs often
   * live under a state-prefixed sub-portal (e.g. ge.globo/pe/futebol/times/...)
   * with no single consistent pattern; see sources/ge-globo/client.ts's
   * NON_STANDARD_AGENDA_PATHS for teams that needed one. Do not guess again —
   * look it up (curl the candidate URL, check for a 200 + matching title)
   * before filling in.
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

// Full Série A + Série B 2026 roster (source: pt.wikipedia.org's season
// articles, cross-checked against live ge.globo match data — e.g. Remo
// showing up as a Série A opponent independently confirmed its promotion).
// Every geGlobo slug was verified with a live HTTP request (200 + matching
// page title), not guessed — see review.md for the ones that still couldn't
// be found after real effort (documented there, not silently wrong).
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
  { id: "mirassol", displayName: "Mirassol", color: "green-900", crestFile: "mirassol.svg", tracked: true, aliases: { geGlobo: "mirassol" } },
  { id: "palmeiras", displayName: "Palmeiras", color: "green-900", crestFile: "palmeiras.svg", tracked: true, aliases: { geGlobo: "palmeiras" } },
  { id: "santos", displayName: "Santos", color: "black", crestFile: "santos.svg", tracked: true, aliases: { geGlobo: "santos" } },
  { id: "sao_paulo", displayName: "São Paulo", color: "red-800", crestFile: "sao_paulo.svg", tracked: true, aliases: { geGlobo: "sao-paulo" } },
  { id: "sport_recife", displayName: "Sport", color: "red-800", crestFile: "sport_recife.svg", tracked: true, aliases: { geGlobo: null } },
  { id: "vasco_da_gama", displayName: "Vasco", color: "black", crestFile: "vasco_da_gama.svg", tracked: true, aliases: { geGlobo: "vasco" } },
  { id: "vitoria", displayName: "Vitória", color: "red-800", crestFile: "vitoria.svg", tracked: true, aliases: { geGlobo: "vitoria" } },
  // Promoted into Série A 2026 (replacing Ceará/Fortaleza/Juventude/Sport, all relegated — kept above, now valid as Série B entries instead)
  { id: "athletico_paranaense", displayName: "Athletico-PR", color: "red-800", crestFile: "athletico_paranaense.svg", tracked: true, aliases: { geGlobo: null } },
  { id: "chapecoense", displayName: "Chapecoense", color: "green-900", crestFile: "chapecoense.svg", tracked: true, aliases: { geGlobo: null } },
  { id: "coritiba", displayName: "Coritiba", color: "green-900", crestFile: "coritiba.svg", tracked: true, aliases: { geGlobo: "coritiba" } },
  { id: "remo", displayName: "Remo", color: "blue-800", crestFile: "remo.svg", tracked: true, aliases: { geGlobo: null } },
  // Série B 2026 (not already covered above)
  { id: "america_mineiro", displayName: "América-MG", color: "green-900", crestFile: "america_mineiro.svg", tracked: true, aliases: { geGlobo: "america-mg" } },
  { id: "athletic", displayName: "Athletic", color: "black", crestFile: "athletic.svg", tracked: true, aliases: { geGlobo: null } },
  { id: "atletico_goianiense", displayName: "Atlético-GO", color: "red-800", crestFile: "atletico_goianiense.svg", tracked: true, aliases: { geGlobo: "atletico-go" } },
  { id: "avai", displayName: "Avaí", color: "blue-800", crestFile: "avai.svg", tracked: true, aliases: { geGlobo: null } },
  { id: "botafogo_sp", displayName: "Botafogo-SP", color: "black", crestFile: "botafogo_sp.svg", tracked: true, aliases: { geGlobo: "botafogo-sp" } },
  { id: "crb", displayName: "CRB", color: "red-800", crestFile: "crb.svg", tracked: true, aliases: { geGlobo: "crb" } },
  { id: "criciuma", displayName: "Criciúma", color: "black", crestFile: "criciuma.svg", tracked: true, aliases: { geGlobo: "criciuma" } },
  { id: "cuiaba", displayName: "Cuiabá", color: "green-900", crestFile: "cuiaba.svg", tracked: true, aliases: { geGlobo: null } },
  { id: "goias", displayName: "Goiás", color: "green-900", crestFile: "goias.svg", tracked: true, aliases: { geGlobo: "goias" } },
  { id: "londrina", displayName: "Londrina", color: "blue-800", crestFile: "londrina.svg", tracked: true, aliases: { geGlobo: null } },
  { id: "nautico", displayName: "Náutico", color: "red-800", crestFile: "nautico.svg", tracked: true, aliases: { geGlobo: "nautico" } },
  { id: "novorizontino", displayName: "Novorizontino", color: "red-800", crestFile: "novorizontino.svg", tracked: true, aliases: { geGlobo: null } },
  { id: "operario_pr", displayName: "Operário-PR", color: "green-900", crestFile: "operario_pr.svg", tracked: true, aliases: { geGlobo: "operario-pr" } },
  { id: "ponte_preta", displayName: "Ponte Preta", color: "black", crestFile: "ponte_preta.svg", tracked: true, aliases: { geGlobo: null } },
  { id: "sao_bernardo", displayName: "São Bernardo", color: "red-800", crestFile: "sao_bernardo.svg", tracked: true, aliases: { geGlobo: null } },
  { id: "vila_nova", displayName: "Vila Nova", color: "red-800", crestFile: "vila_nova.svg", tracked: true, aliases: { geGlobo: "vila-nova" } },
];

export function findTeamById(id: string): Team | undefined {
  return TEAMS.find((team) => team.id === id);
}
