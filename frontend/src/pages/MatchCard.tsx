import type { MatchView, Team } from "@ondevaipassar/shared";
import { findTeamById, formatKickoffLabel } from "@ondevaipassar/shared";
import TeamCrest from "../Components/TeamCrest";
import versus from "../assets/images/icones/versus.svg";
import MatchBroadcasts from "./MatchBroadcasts";

interface MatchCardProps {
  match: MatchView;
  team?: Team | null;
}

const MatchCard = ({ match, team }: MatchCardProps) => {
  return (
    <li className="py-6 max-sm:py-0">
      <div className="grid grid-cols-[1fr_400px_1fr] gap-2 py-8 px-4 max-lg:grid-cols-3 max-lg:py-2 max-lg:px-2 max-sm:flex max-sm:flex-col max-sm:items-center max-sm:gap-2 max-sm:py-4">
        {/*
          Crests use a fixed height + w-auto, not size-* (equal w/h): a
          crest's real silhouette isn't always square (a shield-shaped one,
          e.g. Flamengo, is narrower than tall), and forcing a square box
          centers it with dead space on the sides nearest the "x", making
          it read as sitting further away than a round crest's does.
          w-auto only looks right because the crest SVGs are cropped tight
          to their real content — an uncropped file would still show its
          old square canvas here.
        */}
        <div className="flex items-center justify-self-end gap-4 max-lg:gap-2 max-lg:justify-self-center">
          <TeamCrest
            team={match.homeTeamId ? findTeamById(match.homeTeamId) : undefined}
            name={match.homeTeamName}
            sourceCrestUrl={match.homeTeamCrestUrl}
            className="h-32 w-auto max-lg:h-20 max-sm:h-18"
          />
          <img className="size-6 max-lg:size-4" src={versus} alt="versus" />
          <TeamCrest
            team={match.awayTeamId ? findTeamById(match.awayTeamId) : undefined}
            name={match.awayTeamName}
            sourceCrestUrl={match.awayTeamCrestUrl}
            className="h-32 w-auto max-lg:h-20 max-sm:h-18"
          />
        </div>

        <div className="flex flex-col justify-center gap-2 uppercase font-bold text-center h-full">
          <p>
            {match.homeTeamName} x {match.awayTeamName}
          </p>
          <p>{match.competitionName}</p>
          <p>{formatKickoffLabel(match.kickoffUtc, match.kickoffTimeConfirmed)}</p>
        </div>

        <div className="flex items-center justify-start max-sm:justify-center">
          <MatchBroadcasts broadcasts={match.broadcasts} fallbackColor={team?.color} />
        </div>
      </div>
    </li>
  );
};

export default MatchCard;
