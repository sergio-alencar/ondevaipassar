// hooks/useProximosJogos.jsx

import { useState, useEffect } from "react";
import { normalizarNomeArquivo } from "../utils/times";

export const useProximosJogos = (time) => {
	const [proximosJogos, setProximosJogos] = useState([]);
	const [erro, setErro] = useState(null);
	const [carregando, setCarregando] = useState(true);

	useEffect(() => {
		const carregarJogos = async () => {
			try {
				if (!time || !time.nome) {
					throw new Error("Time inválido ou sem nome definido");
				}

				setCarregando(true);
				setErro(null);

				const nomeFormatado = normalizarNomeArquivo(time.nome);

				const isDevelopment =
					window.location.hostname === "localhost" ||
					window.location.hostname === "127.0.0.1";

				const basePath = isDevelopment
					? "/ondevaipassar-teste/output/teams"
					: "https://sergio-alencar.github.io/ondevaipassar-teste/output/teams";

				const url = `${basePath}/${nomeFormatado}_proximos_jogos.json`;

				console.log("Fetching absolute URL:", window.location.origin + url);

				const response = await fetch(url);

				const contentType = response.headers.get("content-type");
				if (contentType && contentType.includes("text/html")) {
					throw new Error("O servidor retornou uma página HTML em vez de JSON");
				}

				if (!response.ok) {
					throw new Error(
						`Erro HTTP: ${response.status} - ${response.statusText}`
					);
				}

				const text = await response.text();
				let data;

				try {
					data = JSON.parse(text);
				} catch (parseError) {
					console.error("Erro ao parsear JSON:", parseError);
					console.error("Conteúdo recebido:", text);
					throw new Error("Resposta inválida do servidor - não é JSON válido");
				}

				if (!data.proximosJogos || data.proximosJogos.length === 0) {
					throw new Error("Nenhum jogo encontrado no arquivo.");
				}

				const jogosOrdenados = data.proximosJogos.sort((a, b) => {
					return new Date(a.data) - new Date(b.data);
				});

				setProximosJogos(jogosOrdenados);
			} catch (error) {
				console.error("Erro detalhado:", error);
				setErro(`Erro ao carregar os jogos: ${error.message}`);
				setProximosJogos([]);
			} finally {
				setCarregando(false);
			}
		};

		carregarJogos();
	}, [time]);

	return { proximosJogos, erro, carregando };
};
