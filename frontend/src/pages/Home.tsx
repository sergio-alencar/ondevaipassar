import { isTodayInBrasilia } from "@ondevaipassar/shared";
import { useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import DivisionTabs from "../Components/DivisionTabs";
import TeamCrest from "../Components/TeamCrest";
import { MatchesContext } from "../context/MatchesContext";
import { findSourceCrestUrl } from "../lib/assets";
import { useTeamsByDivision } from "../lib/useTeamsByDivision";
import MatchCard from "./MatchCard";
import type { SetSelectedTeam } from "../types";

interface HomeProps {
  setSelectedTeam: SetSelectedTeam;
}

const Home = ({ setSelectedTeam }: HomeProps) => {
  const { matches, loading, error } = useContext(MatchesContext);
  const { division, setDivision, teamsInDivision } = useTeamsByDivision();

  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  const matchesToday = matches.filter((match) => isTodayInBrasilia(match.kickoffUtc));

  return (
    <main className="py-4 max-lg:grow max-w-7xl mx-auto px-4">
      <div>
        <p className="text-4xl font-bold mb-8 pt-8 uppercase text-center max-sm:text-2xl text-gray-800">
          Escolha seu time
        </p>
        <div className="mb-8">
          <DivisionTabs active={division} onChange={setDivision} />
        </div>
        <ul className="flex flex-wrap gap-10 justify-items-center justify-center max-sm:grid max-sm:grid-cols-4 max-sm:gap-x-2 max-sm:gap-y-4">
          {teamsInDivision.map((team) => (
            <li key={team.id} onClick={() => setSelectedTeam(team)}>
              <Link to={`/time/${team.id}`}>
                {/*
                  h-* w-auto, not h-* w-* (both fixed): a browser's default
                  img sizing computes height from width when only width is
                  constrained, so a fixed WIDTH box left a narrower-than-
                  square crest (e.g. Flamengo) taller than a squarer one's
                  box instead of the same height every crest was meant to
                  share. Fixing height instead and letting width follow the
                  crest's own real aspect ratio is what actually makes
                  every crest's height consistent (same fix already
                  applied to MatchCard.tsx).
                */}
                <TeamCrest
                  team={team}
                  name={team.displayName}
                  sourceCrestUrl={findSourceCrestUrl(team.id, matches)}
                  className="h-38 w-auto px-4 py-2 hover:scale-105 transition max-sm:h-18 max-lg:h-24 max-lg:px-2 max-lg:py-0"
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
