import type { MatchView, Team } from "@ondevaipassar/shared";
import { findTeamById } from "@ondevaipassar/shared";
import TeamCrest from "../Components/TeamCrest";
import versus from "../assets/images/icones/versus.svg";
import MatchBroadcasts from "./MatchBroadcasts";

interface MatchCardProps {
  match: MatchView;
  team?: Team | null;
}

// A visitor's browser timezone shouldn't change what date/time a Brazilian
// match shows as — always format in Brasília time explicitly.
function formatKickoff(kickoffUtc: string): string {
  const date = new Date(kickoffUtc);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Sao_Paulo",
  })
    .format(date)
    .replace(/\./g, "")
    .replace(" de ", "-");
  const timeLabel = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return `${dateLabel}, ${timeLabel}`;
}

const MatchCard = ({ match, team }: MatchCardProps) => {
  return (
    <li className="py-6 max-sm:py-0">
      <div className="grid grid-cols-[1fr_400px_1fr] gap-2 py-8 px-4 max-lg:grid-cols-3 max-lg:py-2 max-lg:px-2 max-sm:flex max-sm:flex-col max-sm:items-center max-sm:gap-2 max-sm:py-4">
        <div className="flex items-center justify-self-end gap-4 max-lg:gap-2 max-lg:justify-self-center">
          <TeamCrest
            team={match.homeTeamId ? findTeamById(match.homeTeamId) : undefined}
            name={match.homeTeamName}
            sourceCrestUrl={match.homeTeamCrestUrl}
            className="size-32 max-lg:size-20 max-sm:size-18"
          />
          <img className="size-6 max-lg:size-4" src={versus} alt="versus" />
          <TeamCrest
            team={match.awayTeamId ? findTeamById(match.awayTeamId) : undefined}
            name={match.awayTeamName}
            sourceCrestUrl={match.awayTeamCrestUrl}
            className="size-32 max-lg:size-20 max-sm:size-18"
          />
        </div>

        <div className="flex flex-col justify-center gap-2 uppercase font-bold text-center h-full">
          <p>
            {match.homeTeamName} x {match.awayTeamName}
          </p>
          <p>{match.competitionName}</p>
          <p>{formatKickoff(match.kickoffUtc)}</p>
        </div>

        <div className="flex items-center justify-center">
          <MatchBroadcasts broadcasts={match.broadcasts} fallbackColor={team?.color} />
        </div>
      </div>
    </li>
  );
};

export default MatchCard;
