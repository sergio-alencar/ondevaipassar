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
      // A heavier, darker rule above each competition than the hairline between
      // two matches inside one: without it the heading read as one more row.
      // The first competition has nothing above it to separate from.
      <section key={group.id} className="border-t-2 border-gray-400 pt-10 first:border-t-0 first:pt-0">
        <h3 className="text-balance text-center text-2xl max-sm:text-lg font-bold uppercase text-gray-800">
          <Link to={`/campeonato/${group.id}`} className="flex items-center justify-center gap-3 hover:underline max-sm:flex-col max-sm:gap-1">
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
