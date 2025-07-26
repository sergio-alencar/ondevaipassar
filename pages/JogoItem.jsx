// pages/JogoItem.jsx

import React from "react";
import escudo from "/src/assets/images/icones/escudo-cinza.svg";
import versus from "/src/assets/images/icones/versus.svg";
import { formatarNomeTime } from "../utils/nomes/formatters";
import { obterImagemTime } from "../utils/times";
import { ajustesManuais } from "../utils/nomes/ajustesManuais";
import CanaisDoJogo from "./CanaisDoJogo";

const prepararNomeParaExibicao = (nomeTime) => {
	const nomeFormatado = formatarNomeTime(nomeTime);
	return ajustesManuais[nomeFormatado] || nomeFormatado;
};

const JogoItem = ({ jogo, time }) => {
	if (!jogo) {
		return null;
	}

	console.log("Objeto Jogo recebido em JogoItem:", jogo);

	return (
		<li className="py-6 max-sm:py-0">
			<div className="grid grid-cols-[1fr_400px_1fr] gap-2 py-8 px-4 max-lg:grid-cols-3 max-lg:py-2 max-lg:px-2 max-sm:flex max-sm:flex-col max-sm:items-center max-sm:gap-2 max-sm:py-4">
				<div className="flex items-center justify-self-end gap-4 max-lg:gap-2 max-lg:justify-self-center">
					<img
						crossOrigin="anonymous"
						className="size-32 max-lg:size-20 max-sm:size-18"
						src={obterImagemTime(jogo.timeCasa)}
						alt={prepararNomeParaExibicao(jogo.timeCasa)}
						title={prepararNomeParaExibicao(jogo.timeCasa)}
						onError={(e) => {
							console.error(`Erro ao carregar: ${e.target.src}`);
							e.target.src = escudo;
							e.target.onerror = null;
						}}
						loading="lazy"
					/>
					<img className="size-6 max-lg:size-4" src={versus} alt="versus" />
					<img
						crossOrigin="anonymous"
						className="size-32 max-lg:size-20 max-sm:size-18"
						src={obterImagemTime(jogo.timeVisitante)}
						alt={prepararNomeParaExibicao(jogo.timeVisitante)}
						title={prepararNomeParaExibicao(jogo.timeVisitante)}
						onError={(e) => {
							console.error(`Erro ao carregar: ${e.target.src}`);
							e.target.src = escudo;
							e.target.onerror = null;
						}}
						loading="lazy"
					/>
				</div>

				<div className="flex-col justify-items-center gap-6 uppercase font-bold">
					<p>
						{jogo.timeCasa} x {jogo.timeVisitante}
					</p>
					<p>{jogo.campeonato}</p>
					<p>
						{new Date(jogo.data).toLocaleDateString("pt-BR", {
							weekday: "short",
							day: "numeric",
							month: "numeric",
						})}{" "}
						• {jogo.horario}
					</p>
				</div>

				<div className="flex items-center justify-center">
					<CanaisDoJogo canais={jogo.canais} jogo={jogo} time={time} />
				</div>
			</div>
		</li>
	);
};

export default JogoItem;
