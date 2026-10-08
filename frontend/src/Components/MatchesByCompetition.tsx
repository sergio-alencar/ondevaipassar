import { groupMatchesByCompetition, type MatchView } from "@ondevaipassar/shared";
import { Link } from "react-router-dom";
import CompetitionLogo from "./CompetitionLogo";
import MatchCard from "../pages/MatchCard";

interface MatchesByCompetitionProps {
  matches: MatchView[];
}

/**
 * Matches under a heading per competition, in the order a Brazilian reader
 * expects — Brazilian competitions first, Série A before B before C, then the
 * rest by kickoff. The same order the daily digest uses (both call
 * groupMatchesByCompetition), so the site and the message say the same thing.
 */
const MatchesByCompetition = ({ matches }: MatchesByCompetitionProps) => (
  <div className="space-y-10">
    {groupMatchesByCompetition(matches).map((group) => (
      <section key={group.id}>
        <h3 className="text-2xl max-sm:text-lg font-bold uppercase text-gray-800">
          <Link to={`/campeonato/${group.id}`} className="flex items-center justify-center gap-3 hover:underline">
            <CompetitionLogo competitionId={group.id} className="size-9 max-sm:size-7" />
            {group.name}
          </Link>
        </h3>
        <ul className="divide-y divide-gray-300 my-2">
          {group.matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </ul>
      </section>
    ))}
  </div>
);

export default MatchesByCompetition;
