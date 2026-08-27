import { db } from "../db/client.js";
import { matches } from "../db/schema.js";
import { fetchPremiereStreams } from "../sources/premiere/adapter.js";
import { attachBroadcastsFromStreams, runBroadcastSource } from "./attachBroadcasts.js";

const SOURCE_ID = "premiere";
const CHANNEL_ID = "premiere";

/**
 * Supplementary source, not the primary one: ge.globo's own liveWatchSources
 * already surfaces "premiere" for most matches (see
 * ge-globo/adapter.ts:resolveBroadcasts) — this only fills gaps for matches
 * currently in Premiere's own channel-grid rotation that ge.globo's page
 * didn't (yet) list. No local logo asset to source here (unlike the YouTube
 * channels, which have a channel avatar) — Premiere already has one at
 * frontend/public/images/canais/premiere.svg, so this passes null and lets
 * the existing broadcast row's logoUrl (from ge.globo, when there is one)
 * stand; a match with no prior "premiere" broadcast at all falls back to
 * the frontend's local asset regardless (see lib/assets.ts).
 */
export async function runPremiereEnrichment(): Promise<void> {
  const allMatches = await db.select().from(matches);
  await runBroadcastSource(SOURCE_ID, async () => {
    const streams = await fetchPremiereStreams();
    await attachBroadcastsFromStreams({
      sourceId: SOURCE_ID,
      channelId: CHANNEL_ID,
      streams: streams.map((stream) => ({ ...stream, streamDateUtc: stream.startTimeUtc })),
      channelLogoUrl: null,
      allMatches,
    });
  });
}
