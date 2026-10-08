import { groupMatchesByCompetition, isWithinNextDaysInBrasilia, type MatchView } from "@ondevaipassar/shared";
import { Link } from "react-router-dom";
import CompetitionLogo from "../../Components/CompetitionLogo";
import { WEEK_DAYS } from "../../lib/windows";

interface CampeonatosTabProps {
  matches: MatchView[];
}

/** Competitions with games this week, in the digest's order, each linking to its own page. */
const CampeonatosTab = ({ matches }: CampeonatosTabProps) => {
  const groups = groupMatchesByCompetition(matches.filter((match) => isWithinNextDaysInBrasilia(match.kickoffUtc, WEEK_DAYS)));

  if (groups.length === 0) {
    return <p className="py-8 text-center text-lg text-gray-500">Nenhum jogo nos próximos dias.</p>;
  }

  return (
    <ul className="mx-auto grid max-w-4xl grid-cols-2 gap-4 max-sm:grid-cols-1">
      {groups.map((group) => (
        <li key={group.id}>
          <Link
            to={`/campeonato/${group.id}`}
            className="flex h-full items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm transition hover:scale-[1.02] hover:shadow"
          >
            <CompetitionLogo competitionId={group.id} className="size-12" />
            <span className="flex flex-col">
              <span className="text-lg font-bold uppercase leading-tight text-gray-800">{group.name}</span>
              <span className="mt-1 text-sm text-gray-500">
                {group.matches.length} {group.matches.length === 1 ? "jogo" : "jogos"} nos próximos {WEEK_DAYS} dias
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default CampeonatosTab;
