import { forwardRef } from "react";
import { TEAMS } from "@ondevaipassar/shared";
import type { Team } from "@ondevaipassar/shared";
import DropdownMenuTime from "./DropdownMenuTime";
import triangleIcon from "../assets/images/icones/triangulo.svg";

interface DropdownMenuProps {
  setSelectedTeam: (team: Team) => void;
  isVisible: boolean;
  setIsDropdownVisible: (visible: boolean) => void;
}

// Previously: Header passed a prop named `setIsVisible`, but this component
// destructured `setIsDropdownVisible` — a silent undefined, so selecting a
// team here threw before the <Link> could navigate. The prop name is now
// shared as one type (DropdownMenuProps) both sides import, so a future
// mismatch would fail to typecheck instead of failing at click-time.
const DropdownMenu = forwardRef<HTMLDivElement, DropdownMenuProps>(
  ({ setSelectedTeam, isVisible, setIsDropdownVisible }, ref) => {
    const handleSelectTeam = (team: Team) => {
      setSelectedTeam(team);
      setIsDropdownVisible(false);
    };

    return (
      <div
        ref={ref}
        id="dropdownMenu"
        className={`h-104 w-96 absolute inset-x top-19 right-12 ${
          isVisible ? "block" : "hidden"
        } max-sm:-right-4 max-sm:w-full`}
      >
        <div
          className="size-8 bg-contain bg-center bg-no-repeat z-50 absolute -top-4 right-12 max-sm:right-10"
          style={{ backgroundImage: `url(${triangleIcon})` }}
        ></div>
        <div className="bg-white shadow p-4 rounded-lg">
          <ul className="grid grid-cols-4 gap-6">
            {TEAMS.map((team) => (
              <DropdownMenuTime key={team.id} team={team} setSelectedTeam={handleSelectTeam} />
            ))}
          </ul>
        </div>
      </div>
    );
  },
);

DropdownMenu.displayName = "DropdownMenu";

export default DropdownMenu;
