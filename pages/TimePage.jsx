// pages/TimePage.jsx

import React, { useState } from "react";
import { useParams } from "react-router-dom";
import times from "../Components/times";
import JogoItem from "./JogoItem";
import { useProximosJogos } from "../hooks/useProximosJogos";

const TimePage = () => {
	const [jogosExibidos, setJogosExibidos] = useState(3);
	const { nome } = useParams();
	const time = times.find((t) => t.nome === nome);
	const { proximosJogos, erro, carregando } = useProximosJogos(time);

	if (carregando) {
		return (
			<div className="flex justify-center items-center py-12">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
			</div>
		);
	}

	if (erro) {
		return (
			<div className="text-center py-8">
				<p className="text-red-500 mb-2">Erro ao carregar os jogos:</p>
				<p className="text-gray-600">{erro}</p>
				<p className="text-gray-500 mt-4">
					Verifique se os dados foram gerados corretamente pelo scraper.
				</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 items-center">
			<p
				className={`text-4xl max-sm:text-2xl font-bold uppercase text-${time.cor} justify-self-center pt-8 max-sm:py-4`}
			>
				{time.maiusculo}
			</p>

			<ul className="divide-y divide-gray-300">
				{proximosJogos.length > 0 ? (
					proximosJogos
						.slice(0, jogosExibidos)
						.map((jogo, index) => (
							<JogoItem key={`${jogo.id}-${index}`} jogo={jogo} time={time} />
						))
				) : (
					<p className="text-center text-gray-500 py-8">
						Nenhum jogo agendado para os próximos dias.
					</p>
				)}
			</ul>

			{proximosJogos.length > jogosExibidos && (
				<button
					className="bg-black w-auto justify-self-center text-white uppercase rounded-full font-bold px-4 py-2 mb-12 cursor-pointer"
					onClick={() => setJogosExibidos((prev) => prev + 3)}
				>
					Ver mais jogos
				</button>
			)}
		</div>
	);
};

export default TimePage;
