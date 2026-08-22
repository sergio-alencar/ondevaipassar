import type { MatchStatus } from "@ondevaipassar/shared";

export type { MatchStatus };

export interface CanonicalMatch {
  id: string;
  competitionId: string;
  homeTeamId: string | null;
  homeTeamNameRaw: string;
  awayTeamId: string | null;
  awayTeamNameRaw: string;
  kickoffUtc: string;
  round: number | null;
  status: MatchStatus;
  broadcastChannelIds: string[];
}

export interface FetchResult {
  matches: CanonicalMatch[];
  /** Count of raw items the source returned that could not be turned into a CanonicalMatch (e.g. unparseable date). Feeds scrape_runs so partial failures are visible instead of silent. */
  unresolvedCount: number;
}

export interface FixtureSourceAdapter {
  id: string;
  fetchMatches(): Promise<FetchResult>;
}
