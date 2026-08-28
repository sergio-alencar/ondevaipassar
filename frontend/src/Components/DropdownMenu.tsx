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
        // right-0 top-full, relative to the full header row (see
        // Header.tsx's comment on why not the icon's own tiny box) —
        // this reliably clears the row's real height. Triangle and menu
        // stack in normal flow (flex-col), not each given their own
        // guessed absolute offset, so "menu glued right below the
        // triangle" is zero gap by construction. items-end right-aligns
        // both to the ROW's right edge by default; the triangle then
        // gets its own mr-* pulling it left from there to sit under the
        // icon specifically — see its own comment for the measured value.
        className={`absolute right-0 top-full flex-col items-end ${isVisible ? "flex" : "hidden"}`}
      >
        {/*
          <img src>, not a div with an inline background-image style —
          traced a real bug live: React's own fiber had the correct
          computed style value (confirmed via the dev tools protocol,
          inspecting memoizedProps directly), but it never actually landed
          on the DOM node (getAttribute("style") stayed null even after a
          full Vite restart with a cleared cache and a brand-new browser
          tab, ruling out stale HMR state). Never fully root-caused within
          budget — switching to a plain img sidesteps it entirely and is
          more standard for actual image content anyway.

          mr-23.5 / max-sm:mr-5.5: measured live (devtools protocol) at
          two viewports, not guessed. Two different values because the
          icon isn't at the same offset from the row's edge on both —
          "times" text sits next to it on desktop but is hidden on
          mobile (max-sm:!hidden below), shifting the icon itself. 1440px
          viewport: row's right edge at x=1360, icon center at x=1250 ->
          94px (23.5 * 4px) needed. 390px viewport: row's right edge at
          x=390, icon center at x=352 -> 22px (5.5 * 4px). Both
          re-measured after applying to confirm landing within ~2px of
          the icon's real center.
        */}
        <img src={triangleIcon} alt="" className="w-8 h-auto mt-2 mr-23.5 max-sm:mr-5.5" />
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
