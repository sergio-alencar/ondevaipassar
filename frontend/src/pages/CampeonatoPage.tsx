import { findCompetitionById } from "@ondevaipassar/shared";
import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CompetitionLogo from "../Components/CompetitionLogo";
import DataState from "../Components/DataState";
import FavoriteStar from "../Components/FavoriteStar";
import { MatchesContext } from "../context/MatchesContext";
import { usePreferences } from "../lib/usePreferences";
import MatchCard from "./MatchCard";
import type { SetSelectedTeam } from "../types";

const MATCHES_PER_PAGE = 5;

interface CampeonatoPageProps {
  setSelectedTeam: SetSelectedTeam;
}

const CampeonatoContent = ({ id }: { id: string }) => {
  const { matches, loading, error } = useContext(MatchesContext);
  const [visibleCount, setVisibleCount] = useState(MATCHES_PER_PAGE);
  const { preferences, toggleCompetition } = usePreferences();

  const competitionMatches = matches.filter((match) => match.competitionId === id);
  // A competition no one has registered yet still has a page, named by what
  // its matches carry — the same stopgap the ingest gives an unknown one.
  const name = findCompetitionById(id)?.displayName ?? competitionMatches[0]?.competitionName;

  return (
    <DataState loading={loading} error={error}>
      {name === undefined ? (
        <div className="py-8 text-center text-xl">Campeonato não encontrado.</div>
      ) : (
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center px-4">
          <h1 className="flex items-center justify-center gap-4 justify-self-center pt-8 text-center text-4xl font-bold uppercase text-gray-800 max-sm:gap-3 max-sm:py-4 max-sm:text-2xl">
            <CompetitionLogo competitionId={id} className="size-14 max-sm:size-10" />
            {name}
            {/* Only a registered competition can be followed: an id the registry doesn't know isn't kept on an account. */}
            {findCompetitionById(id) && (
              <FavoriteStar
                active={preferences.competitions.includes(id)}
                onToggle={() => toggleCompetition(id)}
                label={preferences.competitions.includes(id) ? `Deixar de seguir ${name}` : `Seguir ${name}`}
                className="size-8 max-sm:size-6"
              />
            )}
          </h1>

          <ul className="my-8 divide-y divide-gray-300">
            {competitionMatches.length > 0 ? (
              competitionMatches.slice(0, visibleCount).map((match) => <MatchCard key={match.id} match={match} />)
            ) : (
              <p className="py-8 text-center text-lg text-gray-500">Nenhum jogo agendado para os próximos dias.</p>
            )}
          </ul>

          {competitionMatches.length > visibleCount && (
            <button
              type="button"
              className="mb-12 w-auto cursor-pointer justify-self-center rounded-full bg-gray-800 px-6 py-3 font-bold uppercase text-white transition-colors hover:bg-gray-700"
              onClick={() => setVisibleCount((previous) => previous + MATCHES_PER_PAGE)}
            >
              Ver mais jogos
            </button>
          )}

          <Link to="/?aba=campeonatos" className="mb-12 justify-self-center text-sm text-gray-600 underline hover:text-gray-900">
            Todos os campeonatos
          </Link>
        </div>
      )}
    </DataState>
  );
};

const CampeonatoPage = ({ setSelectedTeam }: CampeonatoPageProps) => {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  // keyed by id so "ver mais" starts over when the visitor moves to another competition
  return id ? <CampeonatoContent key={id} id={id} /> : null;
};

export default CampeonatoPage;
