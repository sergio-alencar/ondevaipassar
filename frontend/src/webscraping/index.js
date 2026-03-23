import config from "./config/constants.js";
import teams from "./config/teamConfig.js";
import HttpService from "./services/httpService.js";
import FileService from "./services/fileService.js";
import MatchesScraper from "./scrapers/matchesScraper.js";
import ChannelsScraper from "./scrapers/channelsScraper.js";
import dotenv from "dotenv";

dotenv.config();
console.log("API KEY carregada:", process.env.SERPAPI_KEY);

class WebScrapingApp {
  constructor() {
    this.config = config;
    this.httpService = new HttpService(config);
    this.fileService = new FileService(config);
    this.matchesScraper = new MatchesScraper(config, this.httpService);
    this.channelsScraper = new ChannelsScraper(config, this.httpService);
    this.allTeamsData = [];
  }

  async run() {
    try {
      console.time("Tempo total");
      console.log("Iniciando extração de próximos jogos...");

      for (const team of teams) {
        await this.processTeam(team);
        await this.httpService.delay(config.REQUEST_DELAY);
      }

      this.fileService.saveSummary(this.allTeamsData);

      console.log("\nExtração concluída com sucesso!");
      console.timeEnd("Tempo total");
    } catch (error) {
      console.error("Erro na execução principal:", error);
      process.exit(1);
    }
  }

  async processTeam(team) {
    if (this.config.DEBUG) console.log(`\nProcessando: ${team.name}`);

    try {
      const matches = await this.matchesScraper.scrapeTeamMatches(team);

      for (const match of matches) {
        match.canais = await this.channelsScraper.getChannelsForMatch(team, match);
        await this.httpService.delay(config.REQUEST_DELAY / 2);
      }

      const filename = this.fileService.saveTeamsMatches(team, matches);

      this.allTeamsData.push({
        time: team.name,
        timeId: team.betsapiId,
        quantidadeJogos: matches.length,
        proximoJogo: matches[0] || null,
        arquivo: filename,
      });

      if (matches.length > 0 && this.config.DEBUG) {
        console.log(
          `Próximo jogo: ${matches[0].timeCasa} x ${matches[0].timeVisitante} - ${matches[0].data}`
        );
        if (matches[0].canais?.length > 0) {
          console.log(`Canais: ${matches[0].canais.join(", ")}`);
        }
      }
    } catch (error) {
      console.error(`Erro ao processar ${team.name}:`, error.message);
      this.allTeamsData.push({
        time: team.name,
        error: error.message,
      });
    }
  }
}

(async () => {
  const app = new WebScrapingApp();
  await app.run();
})();
