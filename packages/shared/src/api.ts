import type { MatchStatus } from "./match.js";

export interface BroadcastView {
  channelId: string;
  displayName: string;
  url: string;
}

/** Shape returned by GET /api/matches — shared so the backend route and the frontend fetch client can't drift apart. */
export interface MatchView {
  id: string;
  competitionId: string;
  competitionName: string;
  homeTeamId: string | null;
  homeTeamName: string;
  awayTeamId: string | null;
  awayTeamName: string;
  kickoffUtc: string;
  round: number | null;
  status: MatchStatus;
  broadcasts: BroadcastView[];
}
