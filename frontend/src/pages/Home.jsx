import { useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import times from "../Components/times";
import { GamesContext } from "../context/GamesContext";
import JogoItem from "./JogoItem";

const Home = ({ setSelectedTime }) => {
  const { games, loading, error } = useContext(GamesContext);

  useEffect(() => {
    setSelectedTime(null);
  }, [setSelectedTime]);

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
  };

  const isToday = (someDate) => {
    const today = new Date();
    const dateToCompare = new Date(someDate);
    return (
      dateToCompare.getDate() === today.getDate() &&
      dateToCompare.getMonth() === today.getMonth() &&
      dateToCompare.getFullYear() === today.getFullYear()
    );
  };

  const jogosDeHoje = games.filter((game) => isToday(game.data));

  return (
    <main className="py-4 max-lg:grow container mx-auto px-4">
      <div>
        <p className="text-4xl font-bold mb-8 pt-8 uppercase text-center max-sm:text-2xl text-gray-800 ">
          Escolha seu time
        </p>
        <ul className="flex flex-wrap gap-10 justify-items-center max-w-[1100px] mx-auto justify-center max-lg:max-w-3xl">
          {times.map((time) => {
            const baseUrl =
              "https://raw.githubusercontent.com/sergio-alencar/ondevaipassar-teste/main/public/images/times/";
            const urlFinal = `${baseUrl}${time.nome}.svg`;

            return (
              <li key={time.nome} onClick={() => handleTimeSelect(time)}>
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
      </div>

      {loading && <p className="text-center text-lg mt-16">A carregar jogos...</p>}
      {error && <p className="text-center text-lg text-red-500 mt-16">Erro: {error}</p>}

      {!loading && !error && jogosDeHoje.length > 0 && (
        <div className="mt-16">
          <h2 className="text-4xl font-bold mb-8 pt-8 uppercase text-center max-sm:text-2xl text-gray-800 ">
            Jogos de Hoje
          </h2>

          <ul className="divide-y divide-gray-300 my-8">
            {jogosDeHoje.map((jogo, index) => (
              <JogoItem key={`${jogo.data}-${index}`} jogo={jogo} time={null} />
            ))}
          </ul>
        </div>
      )}
    </main>
  );
};

export default Home;
