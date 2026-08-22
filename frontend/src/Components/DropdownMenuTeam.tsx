import { Link } from "react-router-dom";
import type { Team } from "@ondevaipassar/shared";
import TeamCrest from "./TeamCrest";

interface DropdownMenuTeamProps {
  team: Team;
  setSelectedTeam: (team: Team) => void;
  sourceCrestUrl?: string;
}

const DropdownMenuTeam = ({ team, setSelectedTeam, sourceCrestUrl }: DropdownMenuTeamProps) => {
  return (
    <li>
      <Link to={`/time/${team.id}`} onClick={() => setSelectedTeam(team)}>
        <TeamCrest
          team={team}
          name={team.displayName}
          sourceCrestUrl={sourceCrestUrl}
          className="size-10 opacity-70 hover:opacity-100 transition max-sm:opacity-100 max-sm:size-14 max-sm:my-2"
        />
      </Link>
    </li>
  );
};

export default DropdownMenuTeam;
