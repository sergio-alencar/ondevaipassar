import { useState } from "react";
import { TEAMS, type Division } from "@ondevaipassar/shared";

/** Shared by Home's team grid and the header's team-picker dropdown — both filtered the same way independently before this. */
export function useTeamsByDivision(initialDivision: Division = "A") {
  const [division, setDivision] = useState<Division>(initialDivision);
  const teamsInDivision = TEAMS.filter((team) => team.division === division);
  return { division, setDivision, teamsInDivision };
}
