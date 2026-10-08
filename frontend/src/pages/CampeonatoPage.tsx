import { findCompetitionById } from "@ondevaipassar/shared";
import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CompetitionLogo from "../Components/CompetitionLogo";
import DataState from "../Components/DataState";
import FollowButton from "../Components/FollowButton";
import { MatchesContext } from "../context/MatchesContext";
import { usePreferences } from "../lib/usePreferences";
import MatchCard from "./MatchCard";
import type { SetSelectedTeam } from "../types";
import { ActionButton, ActionLink } from "../Components/Action";

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
          </h1>
          {/* Only a registered competition can be followed: an id the registry doesn't know isn't kept on an account. */}
          {findCompetitionById(id) && (
            <div className="flex justify-center justify-self-center pb-2">
              <FollowButton active={preferences.competitions.includes(id)} onToggle={() => toggleCompetition(id)} name={name} />
            </div>
          )}

          <ul className="my-8 divide-y divide-gray-300">
            {competitionMatches.length > 0 ? (
              competitionMatches.slice(0, visibleCount).map((match) => <MatchCard key={match.id} match={match} />)
            ) : (
              <p className="py-8 text-center text-lg text-gray-500">Nenhum jogo agendado para os próximos dias.</p>
            )}
          </ul>

          {competitionMatches.length > visibleCount && (
            <div className="mb-2 flex justify-center">
              <ActionButton icon="down" onClick={() => setVisibleCount((previous) => previous + MATCHES_PER_PAGE)}>
                Ver mais jogos
              </ActionButton>
            </div>
          )}

          <div className="mb-12 flex justify-center">
            <ActionLink to="/?aba=campeonatos" icon="back">
              Todos os campeonatos
            </ActionLink>
          </div>
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
