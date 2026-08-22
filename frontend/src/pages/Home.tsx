import { useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { TEAMS } from "@ondevaipassar/shared";
import { MatchesContext } from "../context/MatchesContext";
import { crestUrl, fallbackCrestUrl } from "../lib/assets";
import MatchCard from "./MatchCard";
import type { SetSelectedTeam } from "../types";

interface HomeProps {
  setSelectedTeam: SetSelectedTeam;
}

// Compares calendar day in Brasília time, not the visitor's local timezone —
// a match near midnight BRT could otherwise show up as "today" a day early
// or late for anyone outside Brazil (or even inside, near the boundary).
function isTodayInBrasilia(kickoffUtc: string): boolean {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  return format.format(new Date()) === format.format(new Date(kickoffUtc));
}

const Home = ({ setSelectedTeam }: HomeProps) => {
  const { matches, loading, error } = useContext(MatchesContext);

  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  const matchesToday = matches.filter((match) => isTodayInBrasilia(match.kickoffUtc));

  return (
    <main className="py-4 max-lg:grow container mx-auto px-4">
      <div>
        <p className="text-4xl font-bold mb-8 pt-8 uppercase text-center max-sm:text-2xl text-gray-800">
          Escolha seu time
        </p>
        <ul className="flex flex-wrap gap-10 justify-items-center max-w-[1100px] mx-auto justify-center max-lg:max-w-3xl">
          {TEAMS.map((team) => (
            <li key={team.id} onClick={() => setSelectedTeam(team)}>
              <Link to={`/time/${team.id}`}>
                <img
                  src={crestUrl(team)}
                  alt={team.displayName}
                  title={team.displayName}
                  className="h-38 w-40 px-4 py-2 hover:scale-105 transition max-sm:h-18 max-sm:w-18 max-lg:w-24 max-lg:px-2 max-lg:py-0"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = fallbackCrestUrl;
                  }}
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {loading && <p className="text-center text-lg mt-16">A carregar jogos...</p>}
      {error && <p className="text-center text-lg text-red-500 mt-16">Erro: {error}</p>}

      {!loading && !error && matchesToday.length > 0 && (
        <div className="mt-16">
          <h2 className="text-4xl font-bold mb-8 pt-8 uppercase text-center max-sm:text-2xl text-gray-800">
            Jogos de Hoje
          </h2>

          <ul className="divide-y divide-gray-300 my-8">
            {matchesToday.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </ul>
        </div>
      )}
    </main>
  );
};

export default Home;
