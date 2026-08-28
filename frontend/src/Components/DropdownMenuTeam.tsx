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
        {/* h-* w-auto, not size-* (both fixed) — see Home.tsx's crest for why: a fixed width left a narrower-than-square crest taller than the others instead of a consistent height. */}
        <TeamCrest
          team={team}
          name={team.displayName}
          sourceCrestUrl={sourceCrestUrl}
          className="h-10 w-auto opacity-70 hover:opacity-100 transition max-sm:opacity-100 max-sm:h-14 max-sm:my-2"
        />
      </Link>
    </li>
  );
};

export default DropdownMenuTeam;
