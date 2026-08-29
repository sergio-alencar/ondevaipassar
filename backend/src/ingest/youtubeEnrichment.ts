import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { matches } from "../db/schema.js";
import { fetchUpcomingStreams } from "../sources/youtube/adapter.js";
import { attachBroadcastsFromStreams, runBroadcastSource } from "./attachBroadcasts.js";
import type { MatchCandidate } from "./broadcastMatching.js";
import { resolveFemininoTeamId } from "./femininoTeamResolver.js";

// Every broadcaster we track that only ever announces matches via a YouTube
// livestream (never gives us a real fixtures feed) — one more entry here is
// the whole diff for tracking a new one, same channelId as
// packages/shared/src/channel.ts's canonical registry.
//
// `division` defaults to men's football (the shared resolveTeamId, see
// fetchUpcomingStreams's own default) — only set `division: "feminino"`
// for a channel confirmed live to broadcast Brasileirão Feminino under a
// team name that would otherwise collide with the men's roster (e.g.
// "Bahia"). Never guess this: check the channel's own /streams tab first.
const TRACKED_CHANNELS: { channelId: string; youtubeChannelId: string; sourceId: string; division?: "feminino" }[] = [
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
  // Sérgio confirmed FPF TV broadcasts Copa Paraná (a state cup ge.globo's
  // own liveWatchSources never confirms a channel for — no other tracked
  // source covers this competition either). Channel id verified live
  // (fetched https://www.youtube.com/@federacaopr, real externalId, not
  // guessed) — as of that same check, the channel had no match scheduled
  // on its own /streams tab yet (smaller broadcasters like this one
  // typically only publish/schedule close to kickoff), so this can't be
  // confirmed end-to-end against a real stream yet; added on the strength
  // of the channel id itself being real, same as every other entry here.
  { channelId: "fpftv", youtubeChannelId: "UCb74ViTMFgndOaTehM5PVdg", sourceId: "youtube-fpftv" },
  // Sérgio reported NSports' link falling back to the channel's generic
  // /streams page instead of the specific match — root cause: futnatv's own
  // "YouTube (NSports)" mention (see futnatvEnrichment.ts/broadcastText.ts)
  // only carries a real watch URL when futnatv's own `youtubeUrl` field is
  // populated for that game, which it often isn't (confirmed live: two real
  // Brasileirão Feminino games both had `youtubeUrl: null` despite
  // mentioning NSports). Tracking the channel directly here, same as every
  // other entry, doesn't depend on futnatv having that field filled in.
  // Channel id verified live (fetched https://www.youtube.com/@NSports,
  // real externalId, title "N Sports" — not guessed). division: "feminino"
  // because its own /streams tab (confirmed live) covers Brasileirão
  // Feminino specifically (e.g. "🔴 AO VIVO E COM IMAGENS I BAHIA X
  // PALMEIRAS I QUARTAS DE FINAL I BRASILEIRÃO FEMININO 2026") — using the
  // shared men's resolver here would either silently fail to match or,
  // worse, attach this stream to a men's fixture of the same team name.
  { channelId: "nsports", youtubeChannelId: "UCf9WJPpsh5BHDY-OeISgIqA", sourceId: "youtube-nsports", division: "feminino" },
];

async function runChannel(channel: (typeof TRACKED_CHANNELS)[number], apiKey: string, allMatches: MatchCandidate[]): Promise<void> {
  const resolveTeamIdFn = channel.division === "feminino" ? resolveFemininoTeamId : undefined;
  const { streams, channelLogoUrl } = await fetchUpcomingStreams(channel.youtubeChannelId, apiKey, resolveTeamIdFn);
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
