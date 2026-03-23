import { useState, useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import times from "../Components/times";
import JogoItem from "./JogoItem";
import { GamesContext } from "../context/GamesContext";

const TimePage = ({ setSelectedTime }) => {
  const [jogosExibidos, setJogosExibidos] = useState(3);
  const { nome } = useParams();
  const { games, loading, error } = useContext(GamesContext);
  const time = times.find((t) => t.nome === nome);

  useEffect(() => {
    if (time) {
      setSelectedTime(time);
    }

    return () => {
      setSelectedTime(null);
    };
  }, [time, setSelectedTime]);

  const proximosJogos = time
    ? games.filter(
        (game) => game.time_casa === time.apiName || game.time_visitante === time.apiName
      )
    : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!time) {
    return <div className="text-center py-8 text-xl">Time não encontrado.</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-2 text-lg">Erro ao carregar os jogos:</p>
        <p className="text-gray-600 ">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-center container mx-auto px-4">
      <p
        className={`text-4xl max-sm:text-2xl font-bold uppercase justify-self-center pt-8 max-sm:py-4 text-${time.cor}`}
      >
        {time.maiusculo}
      </p>

      <ul className="divide-y divide-gray-300  my-8">
        {proximosJogos.length > 0 ? (
          proximosJogos
            .slice(0, jogosExibidos)
            .map((jogo, index) => (
              <JogoItem key={`${jogo.data}-${index}`} jogo={jogo} time={time} />
            ))
        ) : (
          <p className="text-center text-gray-500  py-8 text-lg">
            Nenhum jogo agendado para os próximos dias.
          </p>
        )}
      </ul>

      {proximosJogos.length > jogosExibidos && (
        <button
          className="bg-gray-800 hover:bg-gray-700 w-auto justify-self-center text-white uppercase rounded-full font-bold px-6 py-3 mb-12 cursor-pointer transition-colors"
          onClick={() => setJogosExibidos((prev) => prev + 3)}
        >
          Ver mais jogos
        </button>
      )}
    </div>
  );
};

export default TimePage;
