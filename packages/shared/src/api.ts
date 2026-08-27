import type { MatchStatus } from "./match.js";

export interface BroadcastView {
  channelId: string;
  displayName: string;
  url: string;
  /** A second, equally valid place to find this channel's programming (see Channel.alternateUrl) — shown as a secondary link alongside url, not a fallback for it. */
  alternateUrl?: string;
  /** Prefer a local asset for this channel when we have one; this is the fallback (source-provided) logo, e.g. for channels like ge TV we don't have local art for. */
  logoUrl: string;
  /** Instagram handle (no "@"), for tagging the broadcaster in the poster's caption — undefined until manually verified for that channel (see Channel.instagramHandle). */
  instagramHandle?: string;
  /** True when the source can't confirm this actually airs in the viewer's region (see Channel.regionalCaveat). */
  regionalCaveat: boolean;
}

/** Shape returned by GET /api/matches — shared so the backend route and the frontend fetch client can't drift apart. */
export interface MatchView {
  id: string;
  competitionId: string;
  competitionName: string;
  homeTeamId: string | null;
  homeTeamName: string;
  /** Crest straight from the source — covers any opponent, tracked or not. Prefer a local asset when homeTeamId resolves to a tracked team. */
  homeTeamCrestUrl: string;
  awayTeamId: string | null;
  awayTeamName: string;
  awayTeamCrestUrl: string;
  kickoffUtc: string;
  /** False = only the date is known so far (round scheduled, broadcaster hasn't confirmed an exact kickoff time yet) — kickoffUtc is then a midnight-BRT placeholder, not a real time to display as-is. */
  kickoffTimeConfirmed: boolean;
  round: number | null;
  status: MatchStatus;
  broadcasts: BroadcastView[];
}
