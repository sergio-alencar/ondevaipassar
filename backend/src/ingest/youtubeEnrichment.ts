import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { mapWithConcurrency } from "../lib/concurrency.js";
import { broadcasts, matches } from "../db/schema.js";
import { fetchUpcomingStreams } from "../sources/youtube/adapter.js";
import { attachBroadcastsFromStreams, runBroadcastSource, type BroadcastRow } from "./attachBroadcasts.js";
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
const TRACKED_CHANNELS: {
  channelId: string;
  youtubeChannelId: string;
  sourceId: string;
  division?: "feminino";
  /** Drop any title that doesn't say it's women's football — see fetchUpcomingStreams. */
  womensTitlesOnly?: true;
}[] = [
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
  // Sérgio flagged both for Bundesliga coverage. Real titles confirmed live
  // already match an EXISTING TITLE_PATTERNS entry each — no new regex
  // needed: Jovem Pan uses the Canal GOAT/ge tv shape ("DARMSTADT X
  // HANNOVER 96 | AO VIVO E COM IMAGENS | BUNDESLIGA 2 | 3ª RODADA"),
  // Romário TV uses the ge tv/CazéTV shape ("AO VIVO: UNION BERLIN X
  // FRANKFURT | BUNDESLIGA 2026/27 - 1ª RODADA"). Both channels also post
  // non-live content this same title shape could in principle collide
  // with — Jovem Pan's own post-match recaps for Brazilian games (e.g.
  // "Cruzeiro 1 x 1 Atlético-MG - 26/08/2026 - Copa do Brasil") — but none
  // of those actually contain the literal "AO VIVO" every TITLE_PATTERNS
  // entry requires, so they're already excluded by construction, not by
  // any special-casing here. Men's resolver (the default) is correct for
  // both — neither channel's real content is Feminino.
  { channelId: "jovempanesportes", youtubeChannelId: "UCv-Nx8pSfG_LxbViMz14RWQ", sourceId: "youtube-jovempanesportes" },
  { channelId: "romariotv", youtubeChannelId: "UCDUmY6hhe6qOzf_syVE-8Gg", sourceId: "youtube-romariotv" },
  // Sérgio reported Borussia Dortmund x Villarreal (Champions) missing from
  // the site while it was right there on this channel — the channel simply
  // wasn't tracked. Its titles already match an existing TITLE_PATTERNS
  // entry ("AO VIVO: BORUSSIA DORTMUND X VILLARREAL | UEFA CHAMPIONS LEAGUE
  // 2026-27 (COM IMAGENS)"), so no new regex was needed. Channel id
  // verified live from https://www.youtube.com/@TNTSportsBR (real
  // externalId, not guessed). Note this also produces an HBO Max broadcast
  // for free: see ingest/channelMirroring.ts.
  { channelId: "tntsports", youtubeChannelId: "UCs-6sCz2LJm1PrWQN4ErsPw", sourceId: "youtube-tntsports" },
  // Sérgio asked to follow both for the Libertadores Feminina, where each club
  // streams its own games on its YouTube channel (TV Palmeiras: Lance, "todos
  // os jogos do Verdão"; Meu Timão: Sérgio's call, nothing here confirms it
  // yet). Channel ids read from each channel's own page. Both are club
  // channels — mostly men's football — hence womensTitlesOnly. Meu Timão is
  // also a fan-commentary channel: its recent titles are all shows ("CLIMA
  // DE DECISÃO"), so a watch-along titled "AO VIVO: A X B" would be read as
  // the match itself. Worth watching what it actually attaches.
  { channelId: "tvpalmeiras", youtubeChannelId: "UCBKc-rPDivvwFiWdG-81wxw", sourceId: "youtube-tvpalmeiras", division: "feminino", womensTitlesOnly: true },
  { channelId: "meutimao", youtubeChannelId: "UCwpyuvmJ_mOrebYbUPXtaBQ", sourceId: "youtube-meutimao", division: "feminino", womensTitlesOnly: true },
  // Sérgio: the Libertadores Feminina games may air on UOL Esporte's channel
  // instead of Canal UOL's (@uol) — UOL's own piece only says "Canal UOL".
  // Read on 2026-10-06 its streams tab held talk shows ("BLOCO DE ESPORTE",
  // "DE PRIMEIRA") and no match, so nothing is confirmed; tracked so a game
  // that does show up there gets its own link. Matches are attached to the
  // `uolesporte` channel, a separate entry from `uol`.
  { channelId: "uolesporte", youtubeChannelId: "UC3KHYFWeB0WimMBfm3NEahQ", sourceId: "youtube-uolesporte", division: "feminino", womensTitlesOnly: true },
];

// Enough to take the wall-clock cost down without opening a dozen simultaneous
// connections to the API.
const YOUTUBE_CONCURRENCY = 4;

async function runChannel(
  channel: (typeof TRACKED_CHANNELS)[number],
  apiKey: string,
  allMatches: MatchCandidate[],
  allBroadcasts: BroadcastRow[],
): Promise<void> {
  const resolveTeamIdFn = channel.division === "feminino" ? resolveFemininoTeamId : undefined;
  const { streams, channelLogoUrl } = await fetchUpcomingStreams(
    channel.youtubeChannelId,
    apiKey,
    resolveTeamIdFn,
    channel.division,
    channel.womensTitlesOnly,
  );
  await attachBroadcastsFromStreams({
    sourceId: channel.sourceId,
    channelId: channel.channelId,
    streams,
    channelLogoUrl,
    allMatches,
    allBroadcasts,
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
  const allBroadcasts = await db.select().from(broadcasts);
  // In parallel, a few at a time: each channel is two or three YouTube API
  // round trips, and 13 of them in a row were several seconds of an ingest
  // that has a hard 60s ceiling (see ingest/budget.ts). Safe to overlap — each
  // channel writes only rows of its OWN channelId, reads the shared snapshots
  // without modifying them, and runBroadcastSource contains its own failures.
  await mapWithConcurrency(TRACKED_CHANNELS, YOUTUBE_CONCURRENCY, (channel) =>
    runBroadcastSource(channel.sourceId, () => runChannel(channel, apiKey, allMatches, allBroadcasts)),
  );
}
