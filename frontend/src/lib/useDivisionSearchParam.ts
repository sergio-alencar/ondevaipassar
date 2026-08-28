import { useSearchParams } from "react-router-dom";
import { TEAMS, type Division } from "@ondevaipassar/shared";

const DEFAULT_DIVISION: Division = "A";
const PARAM = "divisao";

/**
 * Like useTeamsByDivision, but the selection lives in the URL (?divisao=b)
 * instead of component state. Home-specific: navigating away to a team page
 * and back (browser back, not the header logo) restores the exact previous
 * URL, so the division survives — plain useState doesn't, since Home fully
 * remounts on that route change and resets to its initial value. The
 * header dropdown's own division tabs stay on plain useTeamsByDivision
 * (ephemeral) — picking a division there while browsing a match shouldn't
 * rewrite the page's own URL.
 *
 * replace: true on every change so switching tabs updates the current
 * history entry instead of pushing a new one — otherwise "back" from a
 * team page would have to step through every tab click made on Home
 * before actually leaving it.
 */
// Every non-default Division value, lowercased, maps back to itself — kept
// as an explicit lookup (not a chain of ternaries) so a 3rd/4th division
// added later can't silently collapse into the default the way a binary
// ternary did here before (any value other than "b" used to fall through
// to "A" without anyone noticing).
const DIVISION_BY_PARAM: Record<string, Division> = { b: "B", c: "C", europa: "EUROPA" };

export function useDivisionSearchParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const division: Division = DIVISION_BY_PARAM[searchParams.get(PARAM) ?? ""] ?? DEFAULT_DIVISION;

  const setDivision = (next: Division) => {
    setSearchParams(next === DEFAULT_DIVISION ? {} : { [PARAM]: next.toLowerCase() }, { replace: true });
  };

  const teamsInDivision = TEAMS.filter((team) => team.division === division);
  return { division, setDivision, teamsInDivision };
}
