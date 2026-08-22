import type { Team } from "@ondevaipassar/shared";

export type SelectedTeam = Team | null;
export type SetSelectedTeam = (team: SelectedTeam) => void;
