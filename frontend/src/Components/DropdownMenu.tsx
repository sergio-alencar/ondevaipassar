import { forwardRef, useContext } from "react";
import type { Team } from "@ondevaipassar/shared";
import { MatchesContext } from "../context/MatchesContext";
import { findSourceCrestUrl } from "../lib/assets";
import { useTeamsByDivision } from "../lib/useTeamsByDivision";
import DivisionTabs from "./DivisionTabs";
import DropdownMenuTeam from "./DropdownMenuTeam";
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
    const { matches } = useContext(MatchesContext);
    const { division, setDivision, teamsInDivision } = useTeamsByDivision();

    const handleSelectTeam = (team: Team) => {
      setSelectedTeam(team);
      setIsDropdownVisible(false);
    };

    return (
      <div
        ref={ref}
        id="dropdownMenu"
        className={`w-96 absolute inset-x top-19 right-12 ${
          isVisible ? "block" : "hidden"
        } max-sm:-right-4 max-sm:w-full`}
      >
        <div
          className="size-8 bg-contain bg-center bg-no-repeat z-50 absolute -top-4 right-12 max-sm:right-10"
          style={{ backgroundImage: `url(${triangleIcon})` }}
        ></div>
        <div className="bg-white shadow p-4 rounded-lg">
          <div className="mb-4">
            <DivisionTabs active={division} onChange={setDivision} />
          </div>
          {/*
            justify-items-center: grid-cols-4 makes 4 *equal-width* columns —
            without this, each <li> defaults to justify-self:stretch (full
            column width), but its content (a Link wrapping a w-auto crest)
            doesn't stretch, so it just sits at the column's left edge. A
            narrow crest visibly hugs the left; a crest wide enough to fill
            the column looks "centered" only by coincidence. This centers
            every item's own (shrink-to-fit) box within its column instead.
          */}
          <ul className="grid grid-cols-4 gap-6 max-h-80 overflow-y-auto justify-items-center">
            {teamsInDivision.map((team) => (
              <DropdownMenuTeam
                key={team.id}
                team={team}
                setSelectedTeam={handleSelectTeam}
                sourceCrestUrl={findSourceCrestUrl(team.id, matches)}
              />
            ))}
          </ul>
        </div>
      </div>
    );
  },
);

DropdownMenu.displayName = "DropdownMenu";

export default DropdownMenu;
