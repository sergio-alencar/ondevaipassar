// src/webscraping/scrapers/channelScraper.js

import axios from "axios";
import * as cheerio from "cheerio";
import { normalizeChannelName } from "../utils/stringUtils.js";
import CONFIG from "../config/constants.js";

const CHANNELS = CONFIG.CHANNELS;

class ChannelsScraper {
	constructor(config, httpService) {
		this.config = config;
		this.httpService = httpService;
	}

	async getChannelsForMatch(team, match) {
		const channels = [];

		try {
			const query = `${match.timeCasa} ${match.timeVisitante} onde assistir`;
			if (this.config.DEBUG) console.log(`DuckDuckGo Search: ${query}`);

			const duckResults = await this.searchDuckDuckGo(query);
			const canais = this.extrairCanaisDosResultados(duckResults);

			channels.push(...canais);
		} catch (error) {
			console.error(`Erro ao buscar canais para ${team.name}:`, error);
		}

		return [...new Set(channels.map(normalizeChannelName))];
	}

	async searchDuckDuckGo(query) {
		const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
			query
		)}`;

		const response = await axios.get(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
			},
		});

		const $ = cheerio.load(response.data);
		const results = [];

		$(".result__snippet, .result__title").each((_, el) => {
			const title = $(el).text().trim();
			results.push({ title, snippet: "" });
		});

		return results;
	}

	extrairCanaisDosResultados(results) {
		const encontrados = new Set();

		results.forEach((result) => {
			const texto = (result.title + " " + result.snippet).toLowerCase();

			CHANNELS.forEach((canal) => {
				if (texto.includes(canal)) {
					encontrados.add(canal);
				}
			});
		});

		return Array.from(encontrados);
	}
}

export default ChannelsScraper;
