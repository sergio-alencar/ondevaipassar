// scraper.js

import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

const config = {
	OUTPUT_DIR: "public/output/teams",
	BETS_API_URL: "https://betsapi.com",
	TEAMS: [
		{
			name: "Atletico-Mineiro",
			betsapiId: "1313",
			urlPath: "/ts/1313/Atletico-Mineiro/",
		},
		{
			name: "Bahia",
			betsapiId: "165469",
			urlPath: "/ts/165469/Bahia/",
		},
		{
			name: "Botafogo",
			betsapiId: "2051",
			urlPath: "/ts/2051/Botafogo/",
		},
		{
			name: "Bragantino",
			betsapiId: "3165",
			urlPath: "/ts/3165/Bragantino/",
		},
		{
			name: "Ceara",
			betsapiId: "1264",
			urlPath: "/ts/1264/Ceara/",
		},
		{
			name: "Corinthians",
			betsapiId: "4128",
			urlPath: "/ts/4128/Corinthians/",
		},
		{
			name: "Cruzeiro",
			betsapiId: "577",
			urlPath: "/ts/577/Cruzeiro/",
		},
		{
			name: "Flamengo",
			betsapiId: "1339",
			urlPath: "/ts/1339/Flamengo/",
		},
		{
			name: "Fluminense",
			betsapiId: "1286",
			urlPath: "/ts/1286/Fluminense/",
		},
		{
			name: "Fortaleza",
			betsapiId: "43589",
			urlPath: "/ts/43589/Fortaleza/",
		},
		{
			name: "Gremio",
			betsapiId: "1312",
			urlPath: "/ts/1312/Gremio/",
		},
		{
			name: "Internacional",
			betsapiId: "1422",
			urlPath: "/ts/1422/Internacional/",
		},
		{
			name: "Juventude",
			betsapiId: "45589",
			urlPath: "/ts/45589/Juventude/",
		},
		{
			name: "Mirassol",
			betsapiId: "8555",
			urlPath: "/ts/8555/Mirassol/",
		},
		{
			name: "Palmeiras",
			betsapiId: "1287",
			urlPath: "/ts/1287/Palmeiras/",
		},
		{
			name: "Santos",
			betsapiId: "579",
			urlPath: "/ts/579/Santos/",
		},
		{
			name: "Sao Paulo",
			betsapiId: "1314",
			urlPath: "/ts/1314/Sao Paulo/",
		},
		{
			name: "Sport-Recife",
			betsapiId: "1421",
			urlPath: "/ts/1421/Sport-Recife/",
		},
		{
			name: "Vasco-da-Gama",
			betsapiId: "56101",
			urlPath: "/ts/56101/Vasco-da-Gama/",
		},
		{
			name: "Vitoria",
			betsapiId: "1419",
			urlPath: "/ts/1419/Vitoria/",
		},
	],
	REQUEST_DELAY: 5000,
	TIMEOUT: 20000,
	DEBUG: true,
	MAX_MATCHES: 10,
	// HEADLESS: true,
};

if (!fs.existsSync(config.OUTPUT_DIR)) {
	fs.mkdirSync(config.OUTPUT_DIR, { recursive: true });
}

const getHeaders = () => ({
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
	Accept:
		"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
	"Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
	Referer: "https://www.google.com/",
	DNT: "1",
	Connection: "keep-alive",
});

async function fetchWithRetry(url, retries = 3) {
	try {
		const response = await axios.get(url, {
			timeout: config.TIMEOUT,
			headers: getHeaders(),
		});
		return response.data;
	} catch (error) {
		if (retries > 0) {
			if (config.DEBUG) {
				console.log(`Tentativa ${4 - retries} falhou, tentando novamente...`);
				console.log("Erro:", error.message);
			}
			await new Promise((resolve) =>
				setTimeout(resolve, config.REQUEST_DELAY * 2)
			);
			return fetchWithRetry(url, retries - 1);
		}
		throw error;
	}
}

async function getTeamMatches(team) {
	try {
		const url = `${config.BETS_API_URL}${team.urlPath}`;
		console.log(`Buscando jogos para ${team.name} em: ${url}`);

		const html = await fetchWithRetry(url);
		const $ = cheerio.load(html);

		const matches = [];

		$("tr").each((index, element) => {
			if (matches.length >= config.MAX_MATCHES) return false;

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

		if (config.DEBUG) {
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

async function saveTeamMatches(team, matches) {
	const filename = `${team.name
		.toLowerCase()
		.replace(/\s+/g, "_")
		.replace(/-/g, "_")}_proximos_jogos.json`;
	const filepath = path.join(config.OUTPUT_DIR, filename);

	const dataToSave = {
		time: team.name,
		timeId: team.betsapiId,
		atualizadoEm: new Date().toISOString(),
		proximosJogos: matches,
	};

	fs.writeFileSync(filepath, JSON.stringify(dataToSave, null, 2));
	if (config.DEBUG) console.log(`Arquivo salvo: ${filename}`);
}

async function processAllTeams() {
	const allTeamsData = [];

	for (const team of config.TEAMS) {
		if (config.DEBUG) console.log(`\nProcessando: ${team.name}`);

		try {
			const matches = await getTeamMatches(team);
			await saveTeamMatches(team, matches);

			allTeamsData.push({
				time: team.name,
				timeId: team.betsapiId,
				quantidadeJogos: matches.length,
				proximoJogo: matches[0] || null,
			});

			if (matches.length > 0 && config.DEBUG) {
				console.log(
					`Próximo jogo: ${matches[0].timeCasa} x ${matches[0].timeVisitante} - ${matches[0].data}`
				);
			}

			if (config.TEAMS.indexOf(team) < config.TEAMS.length - 1) {
				await new Promise((resolve) =>
					setTimeout(resolve, config.REQUEST_DELAY)
				);
			}
		} catch (error) {
			console.error(`Erro ao processar ${team.name}:`, error.message);
		}
	}

	fs.writeFileSync(
		path.join(config.OUTPUT_DIR, "../", "resumo_times.json"),
		JSON.stringify(allTeamsData, null, 2)
	);
}

(async () => {
	try {
		console.time("Tempo total");
		console.log("Iniciando extração de próximos jogos...");

		await processAllTeams();

		console.log("\n✅ Extração concluída com sucesso!");
		console.log(`Arquivos salvos em: ${path.resolve(config.OUTPUT_DIR)}`);
		console.timeEnd("Tempo total");
	} catch (error) {
		console.error("Erro na execução principal:", error);
	}
})();
