// src/webscraping/services/fileService.js

import fs from "fs";
import path from "path";

class FileService {
	constructor(config) {
		this.config = config;
		this.ensureOutputDir();
	}

	ensureOutputDir() {
		if (!fs.existsSync(this.config.OUTPUT_DIR)) {
			fs.mkdirSync(this.config.OUTPUT_DIR, { recursive: true });
		}
	}

	saveTeamsMatches(team, matches) {
		const filename = `${team.name
			.toLowerCase()
			.replace(/\s+/g, "_")
			.replace(/-/g, "_")}_proximos_jogos.json`;

		const filepath = path.join(this.config.OUTPUT_DIR, filename);

		const dataToSave = {
			time: team.name,
			timeId: team.betsapiId,
			atualizadoEm: new Date().toISOString(),
			proximosJogos: matches,
		};

		fs.writeFileSync(filepath, JSON.stringify(dataToSave, null, 2));
		return filename;
	}

	saveSummary(data) {
		const filepath = path.join(
			this.config.OUTPUT_DIR,
			"../",
			"resumo_times.json"
		);
		fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
	}
}

export default FileService;
