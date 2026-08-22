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

export type Division = "A" | "B";

export interface Team {
  id: string;
  displayName: string;
  color: string;
  crestFile: string;
  /** Which division this team plays in for the 2026 season — teams move between these every year (see review.md for how many of the original 20 already did). */
  division: Division;
  /**
   * A verified crest URL to use when there's no local asset AND no ingested
   * match to borrow one from (e.g. a team whose agenda page we haven't
   * found — see aliases.geGlobo === null). Manually sourced, not guessed:
   * open the club's ge.globo team page (or any article mentioning them) and
   * copy the actual <img> src from their badge.
   */
  knownCrestUrl?: string;
  aliases: TeamAliases;
}

// Full Série A + Série B 2026 roster, confirmed directly by Sérgio (matched
// what pt.wikipedia.org's season articles already gave us) — source of truth
// for `division`. Every geGlobo slug was verified with a live HTTP request
// (200 + matching page title), not guessed — see review.md for the ones
// that still couldn't be found after real effort (documented there, not
// silently wrong). Kept alphabetical by displayName (pt-BR collation) —
// re-sort if you add or rename a team, don't just append.
export const TEAMS: Team[] = [
  { id: "america_mineiro", displayName: "América-MG", color: "green-900", crestFile: "america_mineiro.svg", division: "B", aliases: { geGlobo: "america-mg" } },
  { id: "athletic", displayName: "Athletic", color: "black", crestFile: "athletic.svg", division: "B", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2025/01/22/Athletic_Club-mineiro.svg", aliases: { geGlobo: null } },
  { id: "athletico_paranaense", displayName: "Athletico-PR", color: "red-800", crestFile: "athletico_paranaense.svg", division: "A", aliases: { geGlobo: null } },
  { id: "atletico_goianiense", displayName: "Atlético-GO", color: "red-800", crestFile: "atletico_goianiense.svg", division: "B", aliases: { geGlobo: "atletico-go" } },
  { id: "atletico_mineiro", displayName: "Atlético-MG", color: "black", crestFile: "atletico_mineiro.svg", division: "A", aliases: { geGlobo: "atletico-mg" } },
  { id: "avai", displayName: "Avaí", color: "blue-800", crestFile: "avai.svg", division: "B", aliases: { geGlobo: null } },
  { id: "bahia", displayName: "Bahia", color: "blue-900", crestFile: "bahia.svg", division: "A", aliases: { geGlobo: "bahia" } },
  { id: "botafogo", displayName: "Botafogo", color: "black", crestFile: "botafogo.svg", division: "A", aliases: { geGlobo: "botafogo" } },
  { id: "botafogo_sp", displayName: "Botafogo-SP", color: "black", crestFile: "botafogo_sp.svg", division: "B", aliases: { geGlobo: "botafogo-sp" } },
  { id: "bragantino", displayName: "Bragantino", color: "red-800", crestFile: "bragantino.svg", division: "A", aliases: { geGlobo: "bragantino" } },
  { id: "ceara", displayName: "Ceará", color: "black", crestFile: "ceara.svg", division: "B", aliases: { geGlobo: "ceara" } },
  { id: "chapecoense", displayName: "Chapecoense", color: "green-900", crestFile: "chapecoense.svg", division: "A", aliases: { geGlobo: null } },
  { id: "corinthians", displayName: "Corinthians", color: "black", crestFile: "corinthians.svg", division: "A", aliases: { geGlobo: "corinthians" } },
  { id: "coritiba", displayName: "Coritiba", color: "green-900", crestFile: "coritiba.svg", division: "A", aliases: { geGlobo: "coritiba" } },
  { id: "crb", displayName: "CRB", color: "red-800", crestFile: "crb.svg", division: "B", aliases: { geGlobo: "crb" } },
  { id: "criciuma", displayName: "Criciúma", color: "yellow-500", crestFile: "criciuma.svg", division: "B", aliases: { geGlobo: "criciuma" } },
  { id: "cruzeiro", displayName: "Cruzeiro", color: "blue-800", crestFile: "cruzeiro.svg", division: "A", aliases: { geGlobo: "cruzeiro" } },
  { id: "cuiaba", displayName: "Cuiabá", color: "green-900", crestFile: "cuiaba.svg", division: "B", aliases: { geGlobo: null } },
  { id: "flamengo", displayName: "Flamengo", color: "red-800", crestFile: "flamengo.svg", division: "A", aliases: { geGlobo: "flamengo" } },
  { id: "fluminense", displayName: "Fluminense", color: "green-900", crestFile: "fluminense.svg", division: "A", aliases: { geGlobo: "fluminense" } },
  { id: "fortaleza", displayName: "Fortaleza", color: "red-800", crestFile: "fortaleza.svg", division: "B", aliases: { geGlobo: "fortaleza" } },
  { id: "goias", displayName: "Goiás", color: "green-900", crestFile: "goias.svg", division: "B", aliases: { geGlobo: "goias" } },
  { id: "gremio", displayName: "Grêmio", color: "blue-800", crestFile: "gremio.svg", division: "A", aliases: { geGlobo: "gremio" } },
  { id: "internacional", displayName: "Internacional", color: "red-800", crestFile: "internacional.svg", division: "A", aliases: { geGlobo: "internacional" } },
  { id: "juventude", displayName: "Juventude", color: "green-900", crestFile: "juventude.svg", division: "B", aliases: { geGlobo: "juventude" } },
  { id: "londrina", displayName: "Londrina", color: "blue-800", crestFile: "londrina.svg", division: "B", aliases: { geGlobo: null } },
  { id: "mirassol", displayName: "Mirassol", color: "green-900", crestFile: "mirassol.svg", division: "A", aliases: { geGlobo: "mirassol" } },
  { id: "nautico", displayName: "Náutico", color: "red-800", crestFile: "nautico.svg", division: "B", aliases: { geGlobo: "nautico" } },
  { id: "novorizontino", displayName: "Novorizontino", color: "red-800", crestFile: "novorizontino.svg", division: "B", aliases: { geGlobo: null } },
  { id: "operario_pr", displayName: "Operário-PR", color: "black", crestFile: "operario_pr.svg", division: "B", aliases: { geGlobo: "operario-pr" } },
  { id: "palmeiras", displayName: "Palmeiras", color: "green-900", crestFile: "palmeiras.svg", division: "A", aliases: { geGlobo: "palmeiras" } },
  { id: "ponte_preta", displayName: "Ponte Preta", color: "black", crestFile: "ponte_preta.svg", division: "B", aliases: { geGlobo: null } },
  { id: "remo", displayName: "Remo", color: "blue-800", crestFile: "remo.svg", division: "A", aliases: { geGlobo: null } },
  { id: "santos", displayName: "Santos", color: "black", crestFile: "santos.svg", division: "A", aliases: { geGlobo: "santos" } },
  { id: "sao_bernardo", displayName: "São Bernardo", color: "red-800", crestFile: "sao_bernardo.svg", division: "B", aliases: { geGlobo: null } },
  { id: "sao_paulo", displayName: "São Paulo", color: "red-800", crestFile: "sao_paulo.svg", division: "A", aliases: { geGlobo: "sao-paulo" } },
  { id: "sport_recife", displayName: "Sport", color: "red-800", crestFile: "sport_recife.svg", division: "B", aliases: { geGlobo: null } },
  { id: "vasco_da_gama", displayName: "Vasco", color: "black", crestFile: "vasco_da_gama.svg", division: "A", aliases: { geGlobo: "vasco" } },
  { id: "vila_nova", displayName: "Vila Nova", color: "red-800", crestFile: "vila_nova.svg", division: "B", aliases: { geGlobo: "vila-nova" } },
  { id: "vitoria", displayName: "Vitória", color: "red-800", crestFile: "vitoria.svg", division: "A", aliases: { geGlobo: "vitoria" } },
];

export function findTeamById(id: string): Team | undefined {
  return TEAMS.find((team) => team.id === id);
}
