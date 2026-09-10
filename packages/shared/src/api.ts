import type { ChannelKind } from "./channel.js";
import type { MatchStatus } from "./match.js";

export interface BroadcastView {
  channelId: string;
  displayName: string;
  /** How the viewer reaches it — drives the TV/YouTube badge on the logo (see Channel.kind). */
  kind: ChannelKind;
  url: string;
  /** Prefer a local asset for this channel when we have one; this is the fallback (source-provided) logo, e.g. for channels like ge TV we don't have local art for. */
  logoUrl: string;
  /** Instagram handle (no "@"), for tagging the broadcaster in the poster's caption — undefined until manually verified for that channel (see Channel.instagramHandle). */
  instagramHandle?: string;
  /** True when the source can't confirm this actually airs in the viewer's region (see Channel.regionalCaveat). */
  regionalCaveat: boolean;
  /** The broadcaster's own real state-by-state availability text (e.g. "RJ, AC, AL, ..." or "menos SP, CE, MS e PR"), when a source actually gave us one — undefined for the common case, which falls back to a generic "confira a programação local" disclaimer instead. */
  regionalDetail?: string;
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
