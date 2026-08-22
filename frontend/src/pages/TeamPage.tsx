import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { findTeamById } from "@ondevaipassar/shared";
import { MatchesContext } from "../context/MatchesContext";
import { textColorClass } from "../lib/colors";
import MatchCard from "./MatchCard";
import type { SetSelectedTeam } from "../types";

interface TeamPageProps {
  setSelectedTeam: SetSelectedTeam;
}

const MATCHES_PER_PAGE = 3;

const TeamPage = ({ setSelectedTeam }: TeamPageProps) => {
  const [visibleCount, setVisibleCount] = useState(MATCHES_PER_PAGE);
  const { teamId } = useParams<{ teamId: string }>();
  const { matches, loading, error } = useContext(MatchesContext);
  const team = teamId ? findTeamById(teamId) : undefined;

  useEffect(() => {
    setSelectedTeam(team ?? null);
    return () => setSelectedTeam(null);
  }, [team, setSelectedTeam]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!team) {
    return <div className="text-center py-8 text-xl">Time não encontrado.</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-2 text-lg">Erro ao carregar os jogos:</p>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  const teamMatches = matches.filter((match) => match.homeTeamId === team.id || match.awayTeamId === team.id);
  const visibleMatches = teamMatches.slice(0, visibleCount);

  return (
    <div className="grid grid-cols-1 items-center max-w-7xl mx-auto px-4">
      <p
        className={`text-4xl max-sm:text-2xl font-bold uppercase justify-self-center pt-8 max-sm:py-4 ${textColorClass(team.color, "gray-800")}`}
      >
        {team.displayName}
      </p>

      <ul className="divide-y divide-gray-300 my-8">
        {visibleMatches.length > 0 ? (
          visibleMatches.map((match) => <MatchCard key={match.id} match={match} team={team} />)
        ) : (
          <p className="text-center text-gray-500 py-8 text-lg">Nenhum jogo agendado para os próximos dias.</p>
        )}
      </ul>

      {teamMatches.length > visibleCount && (
        <button
          className="bg-gray-800 hover:bg-gray-700 w-auto justify-self-center text-white uppercase rounded-full font-bold px-6 py-3 mb-12 cursor-pointer transition-colors"
          onClick={() => setVisibleCount((prev) => prev + MATCHES_PER_PAGE)}
        >
          Ver mais jogos
        </button>
      )}
    </div>
  );
};

export default TeamPage;
