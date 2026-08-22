import { Link } from "react-router-dom";
import type { Team } from "@ondevaipassar/shared";
import { crestUrl, fallbackCrestUrl } from "../lib/assets";

interface DropdownMenuTimeProps {
  team: Team;
  setSelectedTeam: (team: Team) => void;
}

const DropdownMenuTime = ({ team, setSelectedTeam }: DropdownMenuTimeProps) => {
  return (
    <li>
      <Link to={`/time/${team.id}`} onClick={() => setSelectedTeam(team)}>
        <img
          className="size-10 opacity-70 hover:opacity-100 transition max-sm:opacity-100 max-sm:size-14 max-sm:my-2"
          src={crestUrl(team)}
          alt={team.displayName}
          title={team.displayName}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = fallbackCrestUrl;
          }}
        />
      </Link>
    </li>
  );
};

export default DropdownMenuTime;
