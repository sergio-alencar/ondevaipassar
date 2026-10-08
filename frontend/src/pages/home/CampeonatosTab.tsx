import { findCompetitionById, groupMatchesByCompetition, isWithinNextDaysInBrasilia, type MatchView } from "@ondevaipassar/shared";
import { Link } from "react-router-dom";
import CompetitionLogo from "../../Components/CompetitionLogo";
import FavoriteStar from "../../Components/FavoriteStar";
import { usePreferences } from "../../lib/usePreferences";
import { WEEK_DAYS } from "../../lib/windows";

interface CampeonatosTabProps {
  matches: MatchView[];
}

/**
 * Competitions with games this week, in the digest's order, each linking to
 * its own page. Followed ones come first and stay listed even in a week with
 * no games — a followed competition that vanished from the list in the
 * off-season would look like it had been unfollowed.
 */
const CampeonatosTab = ({ matches }: CampeonatosTabProps) => {
  const { preferences, toggleCompetition } = usePreferences();
  const groups = groupMatchesByCompetition(matches.filter((match) => isWithinNextDaysInBrasilia(match.kickoffUtc, WEEK_DAYS)));

  const cards = [
    ...preferences.competitions.flatMap((id) => {
      const competition = findCompetitionById(id);
      if (!competition) return [];
      return [groups.find((group) => group.id === id) ?? { id, name: competition.displayName, matches: [] }];
    }),
    ...groups.filter((group) => !preferences.competitions.includes(group.id)),
  ];

  if (cards.length === 0) {
    return <p className="py-8 text-center text-lg text-gray-500">Nenhum jogo nos próximos dias.</p>;
  }

  return (
    <ul className="mx-auto grid max-w-4xl grid-cols-2 gap-4 max-sm:grid-cols-1">
      {cards.map((group) => {
        const followed = preferences.competitions.includes(group.id);
        return (
          <li key={group.id} className="relative">
            <Link
              to={`/campeonato/${group.id}`}
              className="flex h-full items-center gap-4 rounded-2xl bg-white px-5 py-4 pr-12 shadow-sm transition hover:scale-[1.02] hover:shadow"
            >
              <CompetitionLogo competitionId={group.id} className="size-12" />
              <span className="flex flex-col">
                <span className="text-lg font-bold uppercase leading-tight text-gray-800">{group.name}</span>
                <span className="mt-1 text-sm text-gray-500">
                  {group.matches.length === 0
                    ? `Sem jogos nos próximos ${WEEK_DAYS} dias`
                    : `${group.matches.length} ${group.matches.length === 1 ? "jogo" : "jogos"} nos próximos ${WEEK_DAYS} dias`}
                </span>
              </span>
            </Link>
            {/* Over the card's corner, outside the <Link>, so tapping it never opens the page. Unregistered competitions can't be kept on an account, so they get no star. */}
            {findCompetitionById(group.id) && (
              <span className="absolute right-3 top-3">
                <FavoriteStar
                  active={followed}
                  onToggle={() => toggleCompetition(group.id)}
                  label={followed ? `Deixar de seguir ${group.name}` : `Seguir ${group.name}`}
                  className="size-6"
                />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default CampeonatosTab;
