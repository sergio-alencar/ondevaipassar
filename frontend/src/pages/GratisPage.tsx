import { isWithinNextDaysInBrasilia } from "@ondevaipassar/shared";
import { useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import DataState from "../Components/DataState";
import MatchesByCompetition from "../Components/MatchesByCompetition";
import { MatchesContext } from "../context/MatchesContext";
import { WEEK_DAYS } from "../lib/windows";
import type { SetSelectedTeam } from "../types";

interface GratisPageProps {
  setSelectedTeam: SetSelectedTeam;
}

const GratisPage = ({ setSelectedTeam }: GratisPageProps) => {
  const { matches, loading, error } = useContext(MatchesContext);

  useEffect(() => {
    setSelectedTeam(null);
  }, [setSelectedTeam]);

  const freeMatches = matches.filter(
    (match) => isWithinNextDaysInBrasilia(match.kickoffUtc, WEEK_DAYS) && match.broadcasts.some((broadcast) => broadcast.free),
  );

  return (
    <DataState loading={loading} error={error}>
      <div className="mx-auto max-w-7xl px-4 pb-12">
        <h1 className="pt-8 text-center text-4xl font-bold uppercase text-gray-800 max-sm:py-4 max-sm:text-2xl">Grátis esta semana</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-gray-500">
          Jogos dos próximos {WEEK_DAYS} dias com pelo menos uma transmissão gratuita confirmada: TV aberta, YouTube e streamings gratuitos. Alguns pedem só um cadastro, sem pagar.
        </p>

        <div className="mt-8">
          {freeMatches.length > 0 ? (
            <MatchesByCompetition matches={freeMatches} />
          ) : (
            <p className="py-8 text-center text-lg text-gray-500">Nenhum jogo gratuito confirmado nos próximos dias.</p>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-gray-600 underline hover:text-gray-900">
            Voltar ao início
          </Link>
        </div>
      </div>
    </DataState>
  );
};

export default GratisPage;
