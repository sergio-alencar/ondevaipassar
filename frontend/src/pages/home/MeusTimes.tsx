import { findTeamById, type MatchView, type Team } from "@ondevaipassar/shared";
import { Link } from "react-router-dom";
import FavoriteStar from "../../Components/FavoriteStar";
import { usePreferences } from "../../lib/usePreferences";
import MatchCard from "../MatchCard";

interface MeusTimesProps {
  matches: MatchView[];
}

/** The followed teams' next game, at the top of the Home. Nothing at all when the visitor follows no one. */
const MeusTimes = ({ matches }: MeusTimesProps) => {
  const { preferences, toggleTeam } = usePreferences();

  // An id we no longer have (a team removed from the registry since it was
  // saved) is skipped, not shown as a hole.
  const teams = preferences.teams.map((id) => findTeamById(id)).filter((team): team is Team => team !== undefined);
  if (teams.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="text-4xl font-bold mb-2 pt-8 uppercase text-center max-sm:text-2xl text-gray-800">Seus times</h2>
      <ul className="divide-y divide-gray-300">
        {teams.map((team) => {
          // `matches` is in kickoff order, so the first hit is the next game.
          const next = matches.find((match) => match.homeTeamId === team.id || match.awayTeamId === team.id);
          return (
            <li key={team.id}>
              <div className="flex items-center justify-center gap-2 pt-6">
                <FavoriteStar active onToggle={() => toggleTeam(team.id)} label={`Deixar de seguir ${team.displayName}`} className="size-6" />
                <Link to={`/time/${team.id}`} className="text-xl font-bold uppercase text-gray-800 hover:underline">
                  {team.displayName}
                </Link>
              </div>
              {next ? <MatchCard match={next} team={team} /> : <p className="py-6 text-center text-gray-500">Nenhum jogo agendado para os próximos dias.</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default MeusTimes;
