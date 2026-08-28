import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { matches } from "../db/schema.js";
import { fetchUpcomingStreams } from "../sources/youtube/adapter.js";
import { attachBroadcastsFromStreams, runBroadcastSource } from "./attachBroadcasts.js";
import type { MatchCandidate } from "./broadcastMatching.js";

// Every broadcaster we track that only ever announces matches via a YouTube
// livestream (never gives us a real fixtures feed) — one more entry here is
// the whole diff for tracking a new one, same channelId as
// packages/shared/src/channel.ts's canonical registry.
const TRACKED_CHANNELS: { channelId: string; youtubeChannelId: string; sourceId: string }[] = [
  { channelId: "cazetv", youtubeChannelId: "UCZiYbVptd3PVPf4f6eR6UaQ", sourceId: "youtube-cazetv" },
  { channelId: "goat", youtubeChannelId: "UC_oToDrJ6uca7d1dFVBmLtg", sourceId: "youtube-goat" },
  { channelId: "getv", youtubeChannelId: "UCgCKagVhzGnZcuP9bSMgMCg", sourceId: "youtube-getv" },
  { channelId: "nossofutebol", youtubeChannelId: "UCMcc9elPZGpg6eU4i3YaCpA", sourceId: "youtube-nossofutebol" },
  { channelId: "sbt", youtubeChannelId: "UCxc3marqP9BJSkQ0_K4mqDg", sourceId: "youtube-sbt" },
  // Added covering Série C — Sérgio's own research: most Série C broadcasts
  // are SportyNet (nossofutebol, already tracked above), Canal do Benja, and
  // Band. Channel id verified live (fetched
  // https://www.youtube.com/@canaldobenjaoficial, real externalId, not
  // guessed) — note there's a different, similarly-named unofficial channel
  // at @canaldobenja with its own distinct id; this is specifically the
  // "oficial" one Sérgio pointed at.
  { channelId: "canaldobenja", youtubeChannelId: "UCT7xKN6IOoITtqnfjB-6m1g", sourceId: "youtube-canaldobenja" },
];

async function runChannel(channel: (typeof TRACKED_CHANNELS)[number], apiKey: string, allMatches: MatchCandidate[]): Promise<void> {
  const { streams, channelLogoUrl } = await fetchUpcomingStreams(channel.youtubeChannelId, apiKey);
  await attachBroadcastsFromStreams({
    sourceId: channel.sourceId,
    channelId: channel.channelId,
    streams,
    channelLogoUrl,
    allMatches,
    // Links straight to this match's own stream instead of the channel's
    // generic /streams page — Sérgio asked for this specifically (a viewer
    // shouldn't have to hunt through a channel's whole upcoming list to
    // find the one match they came for).
    getWatchUrl: (stream) => `https://www.youtube.com/watch?v=${stream.videoId}`,
  });
}

/** Enriches already-ingested matches with broadcasts from every tracked YouTube-only channel. A no-op (logged, not an error) if YOUTUBE_API_KEY isn't configured — same "degrade gracefully" pattern the Instagram poster uses for its own optional credentials. */
export async function runYoutubeEnrichment(): Promise<void> {
  const apiKey = env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.log("[youtube] YOUTUBE_API_KEY not configured, skipping");
    return;
  }

  const allMatches = await db.select().from(matches);
  for (const channel of TRACKED_CHANNELS) {
    await runBroadcastSource(channel.sourceId, () => runChannel(channel, apiKey, allMatches));
  }
}
