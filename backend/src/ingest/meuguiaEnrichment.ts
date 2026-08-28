import { db } from "../db/client.js";
import { matches } from "../db/schema.js";
import { fetchChannelSchedule } from "../sources/meuguia/client.js";
import { attachBroadcastsFromStreams, runBroadcastSource } from "./attachBroadcasts.js";
import type { MatchCandidate } from "./broadcastMatching.js";
import { resolveTeamId } from "./teamResolver.js";

// Every meuguia.tv channel we track this way — one more entry here is the
// whole diff for tracking a new one, same spirit as youtubeEnrichment.ts's
// TRACKED_CHANNELS. Channel code verified live (page title matches);
// ESPN/TNT Sports are foreign-league channels ge.globo's own per-team
// agenda data covers weakly or not at all (confirmed live: Aston Villa x
// Arsenal's ge.globo agenda only listed Disney+, not the ESPN simulcast
// meuguia.tv's own ESPN grid shows) — ge.globo has no dedicated Brazilian
// broadcaster to double-check foreign leagues against the way it does for
// Brasileirão, so this fills a gap YouTube-only sources can't (a real TV
// channel, not a livestream).
const TRACKED_CHANNELS: { code: string; channelId: string; sourceId: string }[] = [
  { code: "ESP", channelId: "espn", sourceId: "meuguia-espn" },
  { code: "TNT", channelId: "tntsports", sourceId: "meuguia-tnt" },
];

async function runChannel(channel: (typeof TRACKED_CHANNELS)[number], allMatches: MatchCandidate[]): Promise<void> {
  const entries = await fetchChannelSchedule(channel.code);
  const streams = entries
    .map((entry) => ({
      homeTeamId: resolveTeamId(entry.homeTeamNameRaw),
      awayTeamId: resolveTeamId(entry.awayTeamNameRaw),
      streamDateUtc: entry.startTimeUtc,
    }))
    // Neither side a team we track at all (e.g. a different sport's "X x Y"
    // that happened to share the "Esporte/Futebol" category, or two clubs
    // outside every division/league this project follows) — nothing to
    // anchor a match to.
    .filter((stream) => stream.homeTeamId !== null || stream.awayTeamId !== null);

  await attachBroadcastsFromStreams({
    sourceId: channel.sourceId,
    channelId: channel.channelId,
    streams,
    channelLogoUrl: null,
    allMatches,
  });
}

/** Enriches already-ingested matches with broadcasts from every tracked meuguia.tv channel grid. */
export async function runMeuguiaEnrichment(): Promise<void> {
  const allMatches = await db.select().from(matches);
  for (const channel of TRACKED_CHANNELS) {
    await runBroadcastSource(channel.sourceId, () => runChannel(channel, allMatches));
  }
}
