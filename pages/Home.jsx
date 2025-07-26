// pages/Home.jsx

import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import times from "../Components/times";

const Home = ({ setSelectedTime }) => {
	useEffect(() => {
		setSelectedTime(null);
	}, [setSelectedTime]);

	const handleTimeSelect = (time) => {
		setSelectedTime(time);
	};

	return (
		<main className="py-4 max-lg:grow">
			<p className="text-4xl font-bold mb-8 pt-8 uppercase text-center max-sm:text-2xl">
				Escolha seu time
			</p>
			<ul className="flex flex-wrap gap-10 justify-items-center max-w-[1100px] mx-auto justify-center max-lg:max-w-3xl">
				{times.map((time) => {
					const baseUrl =
						"https://raw.githubusercontent.com/sergio-alencar/ondevaipassar-teste/main/public/images/times/";
					const urlFinal = `${baseUrl}${time.nome}.svg`;

					return (
						<li
							key={time.nome}
							className=""
							onClick={() => handleTimeSelect(time)}
						>
							<Link to={`/time/${time.nome}`}>
								<img
									src={urlFinal}
									alt={time.nome}
									title={time.maiusculo}
									className="h-38 w-40 px-4 py-2 hover:scale-105 transition max-sm:h-18 max-sm:w-18 max-lg:w-24 max-lg:px-2 max-lg:py-0"
								/>
							</Link>
						</li>
					);
				})}
			</ul>
		</main>
	);
};

export default Home;
