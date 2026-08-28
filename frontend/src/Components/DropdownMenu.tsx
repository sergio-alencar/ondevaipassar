import { forwardRef, useContext } from "react";
import type { Team } from "@ondevaipassar/shared";
import { MatchesContext } from "../context/MatchesContext";
import { findSourceCrestUrl } from "../lib/assets";
import { useTeamsByDivision } from "../lib/useTeamsByDivision";
import DivisionTabs from "./DivisionTabs";
import DropdownMenuTeam from "./DropdownMenuTeam";
import triangleIcon from "../assets/images/icones/triangulo-2.svg";

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
        // right-0, relative to the full header row (see Header.tsx's
        // comment on why not the icon's own tiny box). Triangle and menu
        // stack in normal flow (flex-col), not each given their own
        // guessed absolute offset, so "menu glued right below the
        // triangle" is zero gap by construction. items-end right-aligns
        // both to the ROW's right edge by default; the triangle then
        // gets its own mr-* pulling it left from there to sit under the
        // icon specifically — see its own comment for the measured value.
        //
        // top-14.75 (59px) / max-sm:top-13 (52px), not top-full: Sérgio
        // asked for the whole block pulled up close to the icon,
        // overlapping the header if needed (confirmed fine) rather than
        // clearing it with a gap. top-full (= the row's own height) put
        // the triangle well below the header; these are the icon's own
        // measured bottom edge instead (devtools protocol, same two
        // viewports as the mr-* values below), so the triangle's mt-2
        // gap now measures from the icon itself, not the row.
        //
        // max-sm:right-6: on mobile the menu was flush against the
        // screen's right edge — right-0 anchors to the row's own box,
        // which (row spans full width on mobile, no mx-auto inset)
        // *is* the viewport edge. right-6 (24px) matches the 3rem the
        // menu's own max-sm width formula below already reserves,
        // splitting it into an even 24px gap on both sides instead of
        // all 48px landing on the left alone.
        className={`absolute right-0 max-sm:right-6 top-14.75 max-sm:top-13 flex-col items-end ${isVisible ? "flex" : "hidden"}`}
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

          mr-23.5 / max-sm:mr-0: measured live (devtools protocol), not
          guessed. Re-derive if the wrapper's own right offset above
          changes — this is relative to the wrapper's edge, not the
          viewport, so shifting the wrapper (max-sm:right-6 above) shifts
          where mr-0 lands too. Currently: 1440px viewport, wrapper flush
          with the row (right-0) — icon center at x=1250, needs 94px
          (23.5 * 4px) in. 390px viewport, wrapper inset 24px from the
          row (max-sm:right-6) — icon center at x=352, lands within a
          couple px of center at mr-0, so no further pull-in needed.

          -mb-1: Sérgio spotted a hairline gap between the triangle and
          the box below it. Confirmed via raw pixel sampling (not just a
          zoomed screenshot, which can mislead) that the two were
          touching at a fractional-pixel boundary (triangle height
          computes to 16.0625px) — close but not overlapping, letting a
          single row of the header's own purple bleed through at that
          seam. -mb-1 (4px) pulls the triangle down into the box by more
          than any sub-pixel rounding could reopen; re-verified with the
          same pixel sampling that the purple line is gone.
        */}
        <img src={triangleIcon} alt="" className="w-8 h-auto mt-2 mr-23.5 max-sm:mr-0 -mb-1" />
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

            max-sm:max-h-none: on mobile, 5 rows of the taller mobile
            crest size (see DropdownMenuTeam) exceeded max-h-80, forcing
            a scrollbar Sérgio didn't want. A division is always a fixed
            20 teams (packages/shared/team.ts), so there's no unbounded-
            growth risk in just letting it size to content on mobile —
            desktop keeps the cap since it already fits under it anyway.
          */}
          <ul className="grid grid-cols-4 gap-6 max-h-80 max-sm:max-h-none overflow-y-auto justify-items-center">
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
