import { db } from "../db/client.js";
import { matches } from "../db/schema.js";
import { fetchChannelSchedule } from "../sources/meuguia/client.js";
import { attachBroadcastsFromStreams, runBroadcastSource } from "./attachBroadcasts.js";
import type { MatchCandidate } from "./broadcastMatching.js";
import { resolveTeamId } from "./teamResolver.js";

// Every meuguia.tv channel we track this way — one more entry here is the
// whole diff for tracking a new one, same spirit as youtubeEnrichment.ts's
// TRACKED_CHANNELS. Full code list confirmed live via
// meuguia.tv/programacao/categoria/Esportes (Sérgio pointed at this — it's
// a "what's live right now, by channel" overview, distinct from a single
// channel's own ~2-week grid page, but its <h2> next to each channel link
// names the real channel). ESPN/SporTV each have several numbered feeds
// (ESPN 2-5, SporTV 2-3) that air genuinely different matches at the same
// time (confirmed live: ES4 had Benfica x Estoril and Boca Juniors x
// Lanús while ESP itself had other games) — all funneled into the same
// channelId since a viewer just needs to know "it's on ESPN", not which
// numbered feed, same simplification this codebase's own
// CHANNEL_ALIASES already makes for ge.globo's "SporTV 2"/"SporTV 3" text
// (packages/shared/src/channel.ts). Each code still gets its own sourceId
// so scrape_runs reflects each fetch's own health separately. Left out:
// "135" (Combate, MMA — not football), "OFF" (unclear/generic, not
// obviously football), "121" (Premiere Clubes — redundant with the
// existing dedicated Premiere adapter's own source).
const TRACKED_CHANNELS: { code: string; channelId: string; sourceId: string }[] = [
  { code: "ESP", channelId: "espn", sourceId: "meuguia-esp" },
  { code: "ES2", channelId: "espn", sourceId: "meuguia-es2" },
  { code: "ES3", channelId: "espn", sourceId: "meuguia-es3" },
  { code: "ES4", channelId: "espn", sourceId: "meuguia-es4" },
  { code: "ES5", channelId: "espn", sourceId: "meuguia-es5" },
  { code: "TNT", channelId: "tntsports", sourceId: "meuguia-tnt" },
  { code: "SPO", channelId: "sportv", sourceId: "meuguia-spo" },
  { code: "SP2", channelId: "sportv", sourceId: "meuguia-sp2" },
  { code: "SP3", channelId: "sportv", sourceId: "meuguia-sp3" },
  { code: "BSP", channelId: "band", sourceId: "meuguia-bsp" },
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
