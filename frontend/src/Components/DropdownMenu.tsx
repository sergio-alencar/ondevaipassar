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
        // Triangle and menu are stacked in normal flow (flex-col), not
        // each given their own guessed absolute offset — that's what
        // guarantees "menu glued right below the triangle" (zero gap by
        // construction, not a margin-top value estimated against the
        // wrong box) rather than hoping two independently-positioned
        // elements happen to line up. items-end right-aligns both to
        // this wrapper's own right edge, which (see Header.tsx) is now
        // the escudo icon's own tiny relative box — so the triangle
        // (size-8, close to the icon's own size-7) sits right under the
        // icon, and the wide menu hangs down-left from that same point,
        // same idea as before just anchored precisely instead of
        // estimated.
        className={`absolute right-0 top-full flex-col items-end ${isVisible ? "flex" : "hidden"}`}
      >
        <div
          className="size-8 bg-contain bg-center bg-no-repeat mt-1"
          style={{ backgroundImage: `url(${triangleIcon})` }}
        ></div>
        <div className="bg-white shadow p-4 rounded-lg w-96 max-sm:w-[calc(100vw-3rem)]">
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
