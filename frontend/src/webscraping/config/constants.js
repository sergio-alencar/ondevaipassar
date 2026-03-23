export default {
  REQUEST_DELAY: 3000,
  TIMEOUT: 15000,
  DEBUG: true,
  MAX_MATCHES: 10,
  OUTPUT_DIR: "output/teams",
  BETS_API_URL: "https://betsapi.com",
  CHANNELS: [
    "amazon",
    "band",
    "cazétv",
    "disney+",
    "disney_plus",
    "espn",
    "globo",
    "canal goat",
    "goat",
    "canal_goat",
    "nosso futebol",
    "nosso_futebol",
    "paramount+",
    "paramount_plus",
    "premiere",
    "prime video",
    "prime_video",
    "record",
    "sbt",
    "sportv",
    "tnt sports",
    "tnt_sports",
    "youtube",
  ],
  SOURCES: {
    GE_GLobo: (team) => {
      const geNames = {
        atletico_mineiro: "atletico-mg",
        sao_paulo: "sao-paulo",
        vasco_da_gama: "vasco",
        sport_recife: "sport",
      };
      const geTeam = geNames[team] || team.replace(/_/g, "-");
      return `https://ge.globo.com/futebol/times/${geTeam}/agenda-de-jogos-do-${geTeam}/#/proximos-jogos`;
    },
    OndeAssistir: (team) => {
      const oaNames = {
        atletico_mineiro: "atletico-mineiro",
        sao_paulo: "sao-paulo",
        vasco_da_gama: "vasco",
        sport_recife: "sport",
        bragantino: "red-bull-bragantino",
      };
      const oaTeam = oaNames[team] || team.replace(/_/g, "-");
      return `https://ondeassistiraojogo.com.br/times/${oaTeam}/`;
    },
    Goal: "https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315",
    Sportv: "https://canaisglobo.globo.com/programacao/sportv/3180419/",
    SportvGuide: "https://meuguia.tv/programacao/canal/SPO",
    ESPN: "https://meuguia.tv/programacao/canal/ESP",
    ESPN2: "https://meuguia.tv/programacao/canal/ES2",
    ESPN3: "https://meuguia.tv/programacao/canal/ES3",
    ESPN4: "https://meuguia.tv/programacao/canal/ES4",
    ESPN5: "https://meuguia.tv/programacao/canal/ES5",
    Premiere: "https://meuguia.tv/programacao/canal/121",
    Sportv2: "https://meuguia.tv/programacao/canal/SP2",
    Sportv3: "https://meuguia.tv/programacao/canal/SP3",
  },
};
