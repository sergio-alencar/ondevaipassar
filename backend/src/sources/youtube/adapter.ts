import { resolveTeamId } from "../../ingest/teamResolver.js";
import { fetchChannelAvatarUrl, fetchScheduledStartTimes, searchUpcomingVideos } from "./client.js";
import { parseMatchTitle } from "./schema.js";

export interface YoutubeStream {
  videoId: string;
  // Nullable: a "Europa" club plays almost every match against an opponent
  // we don't individually track (we track 20 clubs, not entire leagues) —
  // see broadcastMatching.ts's TeamPairStream for how a null side is
  // matched as a wildcard rather than dropped.
  homeTeamId: string | null;
  awayTeamId: string | null;
  streamDateUtc: string;
}

export interface YoutubeChannelFetchResult {
  streams: YoutubeStream[];
  /** Null if the channel has no avatar we could read this run — caller keeps whatever logoUrl a broadcast already has rather than overwriting it with null. */
  channelLogoUrl: string | null;
}

/**
 * A tracked broadcaster's YouTube channel has no fixtures API of its own —
 * this reads its "upcoming" (scheduled, not-yet-live) videos, which is
 * enough to say *which* match a stream is for (team names in the title,
 * scheduledStartTime as the real kickoff signal) but never enough to create
 * a match record — see ingest/youtubeEnrichment.ts for how the result gets
 * attached to matches ge.globo already ingested.
 */
export async function fetchUpcomingStreams(youtubeChannelId: string, apiKey: string): Promise<YoutubeChannelFetchResult> {
  const [videos, channelLogoUrl] = await Promise.all([
    searchUpcomingVideos(youtubeChannelId, apiKey),
    fetchChannelAvatarUrl(youtubeChannelId, apiKey),
  ]);

  const candidates: { videoId: string; homeTeamNameRaw: string; awayTeamNameRaw: string }[] = [];
  for (const video of videos) {
    const titleMatch = parseMatchTitle(video.title);
    if (!titleMatch) continue; // not a match stream (interview, highlights, a different sport, etc.)
    candidates.push({ videoId: video.videoId, ...titleMatch });
  }

  const scheduledStartTimes = await fetchScheduledStartTimes(
    candidates.map((c) => c.videoId),
    apiKey,
  );

  const streams: YoutubeStream[] = [];
  for (const candidate of candidates) {
    const streamDateUtc = scheduledStartTimes.get(candidate.videoId);
    if (!streamDateUtc) continue; // "upcoming" in search but no scheduledStartTime — inconsistent response, skip rather than guess

    const homeTeamId = resolveTeamId(candidate.homeTeamNameRaw);
    const awayTeamId = resolveTeamId(candidate.awayTeamNameRaw);
    // Only drop it when NEITHER side is a team we track at all — a
    // "Europa" club vs. an untracked opponent (the normal case there) still
    // has one resolvable side to match on, see broadcastMatching.ts.
    if (!homeTeamId && !awayTeamId) continue;

    streams.push({ videoId: candidate.videoId, homeTeamId, awayTeamId, streamDateUtc });
  }

  return { streams, channelLogoUrl };
}
