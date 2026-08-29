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

export type Division = "A" | "B" | "C" | "EUROPA" | "FEMININO";

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
  { id: "amazonas", displayName: "Amazonas", color: "black", crestFile: "amazonas.svg", division: "C", aliases: { geGlobo: "amazonas-fc" } },
  { id: "america_mineiro", displayName: "América-MG", color: "green-900", crestFile: "america_mineiro.svg", division: "B", aliases: { geGlobo: "america-mg" } },
  { id: "america_mineiro_feminino", displayName: "América-MG (Fem.)", color: "green-900", crestFile: "america_mineiro.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "anapolis", displayName: "Anápolis", color: "red-800", crestFile: "anapolis.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2024/02/20/Anápolis_Cib1JGm.svg", aliases: { geGlobo: null } },
  { id: "arsenal", displayName: "Arsenal", color: "red-800", crestFile: "arsenal.svg", division: "EUROPA", aliases: { geGlobo: "arsenal" } },
  { id: "aston_villa", displayName: "Aston Villa", color: "blue-800", crestFile: "aston_villa.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2025/04/15/aston-villa-75878.svg", aliases: { geGlobo: null } },
  { id: "athletic", displayName: "Athletic", color: "black", crestFile: "athletic.svg", division: "B", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2025/01/22/Athletic_Club-mineiro.svg", aliases: { geGlobo: null } },
  { id: "athletico_paranaense", displayName: "Athletico-PR", color: "red-800", crestFile: "athletico_paranaense.svg", division: "A", aliases: { geGlobo: "athletico-pr" } },
  { id: "atletico_madrid", displayName: "Atlético de Madrid", color: "red-800", crestFile: "atletico_madrid.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2025/06/26/Atletico_Madrid_2025.svg", aliases: { geGlobo: null } },
  { id: "atletico_goianiense", displayName: "Atlético-GO", color: "red-800", crestFile: "atletico_goianiense.svg", division: "B", aliases: { geGlobo: "atletico-go" } },
  { id: "atletico_mineiro", displayName: "Atlético-MG", color: "black", crestFile: "atletico_mineiro.svg", division: "A", aliases: { geGlobo: "atletico-mg" } },
  { id: "atletico_mineiro_feminino", displayName: "Atlético-MG (Fem.)", color: "black", crestFile: "atletico_mineiro.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "avai", displayName: "Avaí", color: "blue-800", crestFile: "avai.svg", division: "B", aliases: { geGlobo: "avai" } },
  { id: "bahia", displayName: "Bahia", color: "blue-900", crestFile: "bahia.svg", division: "A", aliases: { geGlobo: "bahia" } },
  { id: "bahia_feminino", displayName: "Bahia (Fem.)", color: "blue-900", crestFile: "bahia.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "barcelona", displayName: "Barcelona", color: "red-800", crestFile: "barcelona.svg", division: "EUROPA", aliases: { geGlobo: "barcelona" } },
  { id: "barra_sc", displayName: "Barra-SC", color: "blue-800", crestFile: "barra_sc.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2024/01/19/svg.svg", aliases: { geGlobo: null } },
  { id: "bayer_leverkusen", displayName: "Bayer Leverkusen", color: "red-800", crestFile: "bayer_leverkusen.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2023/08/18/bayersvg.svg", aliases: { geGlobo: null } },
  { id: "bayern_munique", displayName: "Bayern de Munique", color: "red-800", crestFile: "bayern_munique.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2018/03/11/bayern-de-munique.svg", aliases: { geGlobo: null } },
  { id: "borussia_dortmund", displayName: "Borussia Dortmund", color: "black", crestFile: "borussia_dortmund.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/teams/2018/03/11/borussia-dortmund.svg", aliases: { geGlobo: null } },
  { id: "botafogo", displayName: "Botafogo", color: "black", crestFile: "botafogo.svg", division: "A", aliases: { geGlobo: "botafogo" } },
  { id: "botafogo_feminino", displayName: "Botafogo (Fem.)", color: "black", crestFile: "botafogo.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "botafogo_pb", displayName: "Botafogo-PB", color: "black", crestFile: "botafogo_pb.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2020/02/12/botsvg.svg", aliases: { geGlobo: null } },
  { id: "botafogo_sp", displayName: "Botafogo-SP", color: "black", crestFile: "botafogo_sp.svg", division: "B", aliases: { geGlobo: "botafogo-sp" } },
  { id: "bragantino", displayName: "Bragantino", color: "red-800", crestFile: "bragantino.svg", division: "A", aliases: { geGlobo: "bragantino" } },
  { id: "bragantino_feminino", displayName: "Bragantino (Fem.)", color: "red-800", crestFile: "bragantino.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "brusque", displayName: "Brusque", color: "red-800", crestFile: "brusque.svg", division: "C", aliases: { geGlobo: "brusque" } },
  { id: "caxias", displayName: "Caxias", color: "red-800", crestFile: "caxias.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2019/01/05/svg-caxias.svg", aliases: { geGlobo: null } },
  { id: "ceara", displayName: "Ceará", color: "black", crestFile: "ceara.svg", division: "B", aliases: { geGlobo: "ceara" } },
  { id: "chapecoense", displayName: "Chapecoense", color: "green-900", crestFile: "chapecoense.svg", division: "A", aliases: { geGlobo: null } },
  { id: "chelsea", displayName: "Chelsea", color: "blue-800", crestFile: "chelsea.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/teams/2018/03/11/chelsea.svg", aliases: { geGlobo: null } },
  { id: "confianca", displayName: "Confiança", color: "blue-800", crestFile: "confianca.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2019/09/10/Confianca.svg", aliases: { geGlobo: null } },
  { id: "corinthians", displayName: "Corinthians", color: "black", crestFile: "corinthians.svg", division: "A", aliases: { geGlobo: "corinthians" } },
  { id: "corinthians_feminino", displayName: "Corinthians (Fem.)", color: "black", crestFile: "corinthians.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "coritiba", displayName: "Coritiba", color: "green-900", crestFile: "coritiba.svg", division: "A", aliases: { geGlobo: "coritiba" } },
  { id: "crb", displayName: "CRB", color: "red-800", crestFile: "crb.svg", division: "B", aliases: { geGlobo: "crb" } },
  { id: "criciuma", displayName: "Criciúma", color: "black", crestFile: "criciuma.svg", division: "B", aliases: { geGlobo: "criciuma" } },
  { id: "cruzeiro", displayName: "Cruzeiro", color: "blue-800", crestFile: "cruzeiro.svg", division: "A", aliases: { geGlobo: "cruzeiro" } },
  { id: "cruzeiro_feminino", displayName: "Cruzeiro (Fem.)", color: "blue-800", crestFile: "cruzeiro.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "cuiaba", displayName: "Cuiabá", color: "green-900", crestFile: "cuiaba.svg", division: "B", aliases: { geGlobo: "cuiaba" } },
  { id: "ferroviaria", displayName: "Ferroviária", color: "red-800", crestFile: "ferroviaria.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2019/01/08/Ferroviaria_Araraquara.svg", aliases: { geGlobo: null } },
  { id: "ferroviaria_feminino", displayName: "Ferroviária (Fem.)", color: "red-800", crestFile: "ferroviaria.svg", division: "FEMININO", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2019/01/08/Ferroviaria_Araraquara.svg", aliases: { geGlobo: null } },
  { id: "figueirense", displayName: "Figueirense", color: "black", crestFile: "figueirense.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2018/03/11/figueirense.svg", aliases: { geGlobo: null } },
  { id: "flamengo", displayName: "Flamengo", color: "red-800", crestFile: "flamengo.svg", division: "A", aliases: { geGlobo: "flamengo" } },
  { id: "flamengo_feminino", displayName: "Flamengo (Fem.)", color: "red-800", crestFile: "flamengo.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "floresta", displayName: "Floresta", color: "green-900", crestFile: "floresta.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2023/05/01/Floresta_Esporte_Clube.svg", aliases: { geGlobo: null } },
  { id: "fluminense", displayName: "Fluminense", color: "green-900", crestFile: "fluminense.svg", division: "A", aliases: { geGlobo: "fluminense" } },
  { id: "fluminense_feminino", displayName: "Fluminense (Fem.)", color: "green-900", crestFile: "fluminense.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "fortaleza", displayName: "Fortaleza", color: "red-800", crestFile: "fortaleza.svg", division: "B", aliases: { geGlobo: "fortaleza" } },
  { id: "goias", displayName: "Goiás", color: "green-900", crestFile: "goias.svg", division: "B", aliases: { geGlobo: "goias" } },
  { id: "gremio", displayName: "Grêmio", color: "blue-800", crestFile: "gremio.svg", division: "A", aliases: { geGlobo: "gremio" } },
  { id: "gremio_feminino", displayName: "Grêmio (Fem.)", color: "blue-800", crestFile: "gremio.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "guarani", displayName: "Guarani", color: "green-900", crestFile: "guarani.svg", division: "C", aliases: { geGlobo: "guarani" } },
  { id: "inter_de_limeira", displayName: "Inter de Limeira", color: "black", crestFile: "inter_de_limeira.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2019/05/11/InterLimeiraSVG.svg", aliases: { geGlobo: null } },
  { id: "inter_de_milao", displayName: "Inter de Milão", color: "blue-900", crestFile: "inter_de_milao.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2021/03/31/Inter_de_Milão_2021.svg", aliases: { geGlobo: null } },
  { id: "internacional", displayName: "Internacional", color: "red-800", crestFile: "internacional.svg", division: "A", aliases: { geGlobo: "internacional" } },
  { id: "internacional_feminino", displayName: "Internacional (Fem.)", color: "red-800", crestFile: "internacional.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "itabaiana", displayName: "Itabaiana", color: "blue-800", crestFile: "itabaiana.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2023/08/28/itabaiana.svg", aliases: { geGlobo: null } },
  { id: "ituano", displayName: "Ituano", color: "red-800", crestFile: "ituano.svg", division: "C", aliases: { geGlobo: "ituano" } },
  { id: "juventude", displayName: "Juventude", color: "green-900", crestFile: "juventude.svg", division: "B", aliases: { geGlobo: "juventude" } },
  { id: "juventude_feminino", displayName: "Juventude (Fem.)", color: "green-900", crestFile: "juventude.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "juventus", displayName: "Juventus", color: "black", crestFile: "juventus.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2025/06/27/Juventus.svg", aliases: { geGlobo: null } },
  { id: "liverpool", displayName: "Liverpool", color: "red-800", crestFile: "liverpool.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2026/07/30/Liverpool.svg", aliases: { geGlobo: null } },
  { id: "londrina", displayName: "Londrina", color: "blue-800", crestFile: "londrina.svg", division: "B", aliases: { geGlobo: "londrina" } },
  { id: "manchester_city", displayName: "Manchester City", color: "blue-800", crestFile: "manchester_city.svg", division: "EUROPA", aliases: { geGlobo: "manchester-city" } },
  { id: "manchester_united", displayName: "Manchester United", color: "red-800", crestFile: "manchester_united.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/teams/2018/03/11/manchester-united.svg", aliases: { geGlobo: null } },
  { id: "maranhao", displayName: "Maranhão", color: "blue-800", crestFile: "maranhao.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2023/05/01/Maranhão_Atlético_Clube.svg", aliases: { geGlobo: null } },
  { id: "maringa", displayName: "Maringá", color: "green-900", crestFile: "maringa.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2023/05/03/Maringá_MfSJ40V.svg", aliases: { geGlobo: null } },
  { id: "milan", displayName: "Milan", color: "red-800", crestFile: "milan.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/teams/2018/03/11/milan.svg", aliases: { geGlobo: null } },
  { id: "mirassol", displayName: "Mirassol", color: "green-900", crestFile: "mirassol.svg", division: "A", aliases: { geGlobo: "mirassol" } },
  // No ge.globo team page found ("mixto", "mixto-ec", "mixto-mt" all 404, confirmed live). Crest sourced from Wikimedia Commons (File:Mixto_EC.svg, provided by Sérgio) — colors (black/white, nickname "Tigre da Vargas") confirmed via web search, not guessed.
  // id has the "_feminino" suffix even though the men's club isn't tracked yet (unlike every other Feminino entry, which mirrors an already-tracked men's team) — Sérgio's own call: the men's Mixto currently plays Série D, but could be promoted to Série C in a future season, at which point it WOULD get tracked under the bare "mixto" id. Suffixing now avoids a collision later instead of a rename under real data.
  { id: "mixto_feminino", displayName: "Mixto", color: "black", crestFile: "mixto.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "napoli", displayName: "Napoli", color: "blue-800", crestFile: "napoli.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2024/07/05/napoli-svg-70751_zoSpRjw.svg", aliases: { geGlobo: null } },
  { id: "nautico", displayName: "Náutico", color: "red-800", crestFile: "nautico.svg", division: "B", aliases: { geGlobo: "nautico" } },
  { id: "newcastle", displayName: "Newcastle", color: "black", crestFile: "newcastle.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2023/09/04/Newcastle_United.svg", aliases: { geGlobo: null } },
  { id: "nottingham_forest", displayName: "Nottingham Forest", color: "red-800", crestFile: "nottingham_forest.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2024/02/27/nottingham_forest.svg", aliases: { geGlobo: null } },
  { id: "novorizontino", displayName: "Novorizontino", color: "black", crestFile: "novorizontino.svg", division: "B", aliases: { geGlobo: "novorizontino" } },
  { id: "operario_pr", displayName: "Operário-PR", color: "black", crestFile: "operario_pr.svg", division: "B", aliases: { geGlobo: "operario-pr" } },
  { id: "palmeiras", displayName: "Palmeiras", color: "green-900", crestFile: "palmeiras.svg", division: "A", aliases: { geGlobo: "palmeiras" } },
  { id: "palmeiras_feminino", displayName: "Palmeiras (Fem.)", color: "green-900", crestFile: "palmeiras.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "paris_saint_germain", displayName: "Paris Saint-Germain", color: "blue-900", crestFile: "paris_saint_germain.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/teams/2018/03/12/paris-saint-germain.svg", aliases: { geGlobo: null } },
  { id: "paysandu", displayName: "Paysandu", color: "blue-900", crestFile: "paysandu.svg", division: "C", aliases: { geGlobo: "paysandu" } },
  { id: "ponte_preta", displayName: "Ponte Preta", color: "black", crestFile: "ponte_preta.svg", division: "B", aliases: { geGlobo: "ponte-preta" } },
  { id: "real_madrid", displayName: "Real Madrid", color: "blue-800", crestFile: "real_madrid.svg", division: "EUROPA", aliases: { geGlobo: "real-madrid" } },
  { id: "remo", displayName: "Remo", color: "blue-800", crestFile: "remo.svg", division: "A", aliases: { geGlobo: "remo" } },
  { id: "santa_cruz", displayName: "Santa Cruz", color: "red-800", crestFile: "santa_cruz.svg", division: "C", aliases: { geGlobo: "santa-cruz" } },
  { id: "santos", displayName: "Santos", color: "black", crestFile: "santos.svg", division: "A", aliases: { geGlobo: "santos" } },
  { id: "santos_feminino", displayName: "Santos (Fem.)", color: "black", crestFile: "santos.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "sao_bernardo", displayName: "São Bernardo", color: "black", crestFile: "sao_bernardo.svg", division: "B", aliases: { geGlobo: null } },
  { id: "sao_paulo", displayName: "São Paulo", color: "red-800", crestFile: "sao_paulo.svg", division: "A", aliases: { geGlobo: "sao-paulo" } },
  { id: "sao_paulo_feminino", displayName: "São Paulo (Fem.)", color: "red-800", crestFile: "sao_paulo.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "sport_recife", displayName: "Sport", color: "red-800", crestFile: "sport_recife.svg", division: "B", aliases: { geGlobo: "sport" } },
  { id: "tottenham", displayName: "Tottenham", color: "blue-900", crestFile: "tottenham.svg", division: "EUROPA", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2018/03/11/tottenham.svg", aliases: { geGlobo: null } },
  { id: "vasco_da_gama", displayName: "Vasco", color: "black", crestFile: "vasco_da_gama.svg", division: "A", aliases: { geGlobo: "vasco" } },
  { id: "vila_nova", displayName: "Vila Nova", color: "red-800", crestFile: "vila_nova.svg", division: "B", aliases: { geGlobo: "vila-nova" } },
  { id: "vitoria", displayName: "Vitória", color: "red-800", crestFile: "vitoria.svg", division: "A", aliases: { geGlobo: "vitoria" } },
  { id: "vitoria_feminino", displayName: "Vitória (Fem.)", color: "red-800", crestFile: "vitoria.svg", division: "FEMININO", aliases: { geGlobo: null } },
  { id: "volta_redonda", displayName: "Volta Redonda", color: "black", crestFile: "volta_redonda.svg", division: "C", aliases: { geGlobo: "volta-redonda" } },
  { id: "ypiranga_rs", displayName: "Ypiranga-RS", color: "green-900", crestFile: "ypiranga_rs.svg", division: "C", knownCrestUrl: "https://s.sde.globo.com/media/organizations/2026/01/18/Ypiranga-RS.svg", aliases: { geGlobo: null } },
];

export function findTeamById(id: string): Team | undefined {
  return TEAMS.find((team) => team.id === id);
}
