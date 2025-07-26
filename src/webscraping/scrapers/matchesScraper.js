// src/webscraping/scrapers/matchesScraper.js

import * as cheerio from "cheerio";

class MatchesScraper {
	constructor(config, httpService) {
		this.config = config;
		this.httpService = httpService;
	}

	async scrapeTeamMatches(team) {
		try {
			const url = `${this.config.BETS_API_URL}${team.urlPath}`;
			console.log(`Buscando jogos para ${team.name} em: ${url}`);

			const html = await this.httpService.get(url);
			const $ = cheerio.load(html);

			const matches = [];

			$("tr").each((index, element) => {
				if (matches.length >= this.config.MAX_MATCHES) return false;

				const cols = $(element).find("td");
				if (cols.length < 5) return;

				const tournament = $(cols[0]).find("a").text().trim();

				const dateTimeStr = $(cols[1]).text().trim();
				if (!dateTimeStr) return;

				const teamsText = $(cols[3])
					.text()
					.replace(/\n/g, " ")
					.replace(/\s+/g, " ")
					.trim();

				const [homeTeam, awayTeam] = teamsText
					.split(" v ")
					.map((team) => team.trim());

				try {
					const [datePart, timePart] = dateTimeStr.split(" ");
					const [month, day] = datePart.split("/").map(Number);
					const [hours, minutes] = timePart.split(":").map(Number);

					const currentDate = new Date();
					let year = currentDate.getFullYear();
					if (month < currentDate.getMonth() + 1) year++;

					const date = new Date(year, month - 1, day, hours, minutes);

					date.setHours(date.getHours() - 3);

					const timestamp = Math.floor(date.getTime() / 1000);

					const formattedTime = timePart;

					matches.push({
						id: `match_${timestamp}_${index}`,
						timeCasa: homeTeam,
						timeVisitante: awayTeam,
						startTimestamp: timestamp,
						data: date.toISOString(),
						horario: formattedTime,
						campeonato: tournament,
					});
				} catch (error) {
					console.warn(`Erro ao processar jogo: ${error.message}`);
				}
			});

			if (this.config.DEBUG) {
				console.log(`Encontrados ${matches.length} jogos para ${team.name}`);
				if (matches.length > 0) {
					console.log("Exemplo de jogo:", matches[0]);
				}
			}

			return matches;
		} catch (error) {
			console.error(`Erro ao buscar jogos do ${team.name}:`, error.message);
			return [];
		}
	}
}

export default MatchesScraper;
