import type { MatchStatus } from "@ondevaipassar/shared";

export type { MatchStatus };

export interface CanonicalBroadcast {
  channelId: string;
  /** Channel logo straight from the source — used when we don't have a local asset for this channel (e.g. Ge TV). */
  logoUrl: string;
}

export interface CanonicalMatch {
  id: string;
  competitionId: string;
  homeTeamId: string | null;
  homeTeamNameRaw: string;
  /** Crest straight from the source — covers any opponent, tracked or not. */
  homeTeamCrestUrl: string;
  awayTeamId: string | null;
  awayTeamNameRaw: string;
  awayTeamCrestUrl: string;
  kickoffUtc: string;
  /** False when the source only knows the match's date (round scheduled) but the broadcaster hasn't confirmed an exact kickoff time yet — kickoffUtc is then a midnight-BRT placeholder for sorting/day-filtering purposes, not a real time to display. */
  kickoffTimeConfirmed: boolean;
  round: number | null;
  status: MatchStatus;
  broadcasts: CanonicalBroadcast[];
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
