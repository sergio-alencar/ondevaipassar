// scraper_canais.js

import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

const config = {
	OUTPUT_DIR: "output/teams",
	REQUEST_DELAY: 1000,
	REQUEST_DELAY_DUCKDUCKGO: 5000,
	MAX_RETRIES: 3,
	DEBUG: true,
};

/**
 * @param {string} homeTeam
 * @param {string} awayTeam
 * @param {string} mainTeam
 * @returns {Promise<string[]>}
 */
async function searchDuckDuckGoForChannels(homeTeam, awayTeam) {
	const searchQueries = [
		`${homeTeam} x ${awayTeam} onde assistir`,
		`${homeTeam} x ${awayTeam} transmissão`,
	];

	const foundChannels = new Set();
	const channelKeywords = [
		"globo",
		"tv globo",
		"sportv",
		"sportv 2",
		"sportv 3",
		"premiere",
		"premiere fc",
		"espn",
		"espn brasil",
		"star+",
		"star plus",
		"prime video",
		"amazon prime",
		"amazon prime video",
		"tnt",
		"tnt plus",
		"cazétv",
		"cazetv",
		"caze tv",
		"paramount+",
		"paramount plus",
		"disney+",
		"disney plus",
		"youtube",
		"band",
		"sbt",
		"cultura",
		"record",
		"max",
		"hbo",
		"hbo max",
	];

	// const normalizedChannelKeywords = channelKeywords.map((k) =>
	// 	k.replace(/[\s\W]+/g, "").toLowerCase()
	// );

	for (const query of searchQueries) {
		if (config.DEBUG) console.log(`  Pesquisando no DuckDuckGo: "${query}"`);
		try {
			const ddgApiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
				query
			)}&format=json&t=ondevaipassar_bot&nohtml=1`;
			const response = await axios.get(ddgApiUrl, {
				headers: {
					"User-Agent":
						"ondevaipassar-scraper/1.0 (https://github.com/sergio-alencar/ondevaipassar-teste)",
				},
				timeout: 15000,
			});

			const ddgData = response.data;

			if (config.DEBUG) {
				console.log(
					` Resposta bruta do DuckDuckGo para "${query}":`,
					JSON.stringify(ddgData, null, 2)
				);
			}
			let combinedText = "";

			if (ddgData.Abstract) {
				combinedText += ddgData.Abstract.toLowerCase() + " ";
			}
			if (ddgData.Result) {
				const $ = cheerio.load(ddgData.Result);
				combinedText += $.text().toLowerCase() + " ";
			}
			if (ddgData.RelatedTopics && Array.isArray(ddgData.RelatedTopics)) {
				ddgData.RelatedTopics.forEach((topic) => {
					if (topic.Text) {
						combinedText += topic.Text.toLowerCase() + " ";
					}
					if (topic.Result) {
						const $ = cheerio.load(topic.Result);
						combinedText += $.text().toLowerCase() + " ";
					}
				});
			}

			combinedText = combinedText
				.replace(/\s\s+/g, " ")
				.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
				.replace(/\s{2,}/g, " ")
				.trim();

			for (const keyword of channelKeywords) {
				const normalizedKeyword = keyword.replace(/[\s\W]+/g, "").toLowerCase();
				if (
					combinedText.includes(keyword.toLowerCase()) ||
					combinedText.includes(normalizedKeyword)
				) {
					let channelName = keyword
						.toLowerCase()
						.replace(/\s/g, "_")
						.replace("+", "_plus");
					foundChannels.add(channelName);
				}
			}

			if (foundChannels.size > 0) {
				if (config.DEBUG)
					console.log(
						`  Canais encontrados via DuckDuckGo para "${query}":`,
						Array.from(foundChannels)
					);
				return Array.from(foundChannels);
			}
		} catch (error) {
			console.error(
				`  Erro ao pesquisar no DuckDuckGo para "${query}": ${error.message}`
			);
		}
		await new Promise((resolve) =>
			setTimeout(resolve, config.REQUEST_DELAY_DUCKDUCKGO)
		);
	}

	return Array.from(foundChannels);
}

async function updateTeamWithChannels(teamFile) {
	console.log(
		`\nAtualizando canais para: ${teamFile
			.replace("_proximos_jogos.json", "")
			.replace(/_/g, "-")}`
	);
	try {
		const filePath = path.join(config.OUTPUT_DIR, teamFile);
		let teamData = JSON.parse(fs.readFileSync(filePath, "utf8"));

		for (const jogo of teamData.proximosJogos) {
			console.log(
				`Buscando canais para: ${jogo.timeCasa} x ${jogo.timeVisitante}`
			);
			let canaisEncontrados = [];

			const ddgChannels = await searchDuckDuckGoForChannels(
				jogo.timeCasa,
				jogo.timeVisitante,
				teamData.time
			);
			if (ddgChannels && ddgChannels.length > 0) {
				canaisEncontrados = [
					...new Set([...canaisEncontrados, ...ddgChannels]),
				];
			} else {
				console.log(
					"Nenhum canal encontrado via DuckDuckGo Search para este jogo."
				);
			}

			if (canaisEncontrados.length === 0) {
				console.log(
					"Nenhum canal encontrado para este jogo após todas as tentativas."
				);
			}
			jogo.canais = Array.from(new Set(canaisEncontrados));
		}

		teamData.atualizadoEm = new Date().toISOString();
		fs.writeFileSync(filePath, JSON.stringify(teamData, null, 2));
		if (config.DEBUG) console.log(`Arquivo atualizado: ${teamFile}`);

		return teamData;
	} catch (error) {
		console.error(`Erro ao atualizar ${teamFile}:`, error.message);
		return null;
	}
}

async function updateAllTeams() {
	try {
		console.time("Tempo total");
		console.log("Iniciando busca por canais de transmissão...");

		const teamFiles = fs
			.readdirSync(config.OUTPUT_DIR)
			.filter((file) => file.endsWith("_proximos_jogos.json"));

		for (const teamFile of teamFiles) {
			await updateTeamWithChannels(teamFile);
		}

		console.log("\n✅ Atualização de canais concluída com sucesso!");
		console.timeEnd("Tempo total");
	} catch (error) {
		console.error("Erro na execução principal:", error);
	}
}

(async () => {
	await updateAllTeams();
})();
