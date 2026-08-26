import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { broadcasts, matches, scrapeRuns } from "../db/schema.js";
import { getErrorMessage } from "../lib/errors.js";
import { fetchUpcomingStreams } from "../sources/youtube/adapter.js";
import type { YoutubeStream } from "../sources/youtube/adapter.js";

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
];

// A stream's scheduled-start date can legitimately be a different calendar
// day than the match's real BRT kickoff date (kickoffUtc is what's stored)
// — e.g. a late-evening BRT kickoff rolls to the next day in UTC. Broadcasters
// also commonly start their livestream hours before actual kickoff for a
// pre-game show (confirmed live: ge tv's stream for a 21:30 BRT kickoff was
// scheduled for 18:30 BRT, a 3h lead-in) — too variable across channels to
// use as a tight time filter, so this stays a same-day check like the
// CazéTV-only version it replaced. Any wider risks a same-pair rematch
// (e.g. a two-legged Copa do Brasil tie) matching the wrong leg.
const DATE_TOLERANCE_DAYS = 1;

interface CalendarDate {
  day: number;
  month: number;
  year: number;
}

// Brazil has used a fixed UTC-3 offset (no DST) since 2019 — same
// assumption ge-globo/adapter.ts already relies on for the reverse
// conversion, safe to reuse here.
function toBrtCalendarDate(utcIso: string): CalendarDate {
  const brt = new Date(new Date(utcIso).getTime() - 3 * 60 * 60 * 1000);
  return { day: brt.getUTCDate(), month: brt.getUTCMonth() + 1, year: brt.getUTCFullYear() };
}

function daysBetween(a: CalendarDate, b: CalendarDate): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / msPerDay;
}

export interface MatchCandidate {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  kickoffUtc: string;
}

export interface MatchedStreams {
  /** ids of already-ingested matches that should get this channel's broadcast attached. */
  matchIds: string[];
  /** streams that didn't resolve to exactly one candidate match — zero (no fixture found yet) or 2+ (genuine ambiguity, e.g. a same-pair rematch within the date tolerance). */
  unresolvedCount: number;
}

/**
 * Pure matching core, split out so it's testable without a real database —
 * "given these streams and these already-ingested matches, which matches
 * should get a broadcast from this channel."
 */
export function matchStreamsToBroadcasts(streams: YoutubeStream[], candidateMatches: MatchCandidate[]): MatchedStreams {
  let unresolvedCount = 0;
  const matchIds: string[] = [];

  for (const stream of streams) {
    const streamDate = toBrtCalendarDate(stream.scheduledStartUtc);
    const candidates = candidateMatches.filter((match) => {
      const sameOrder = match.homeTeamId === stream.homeTeamId && match.awayTeamId === stream.awayTeamId;
      const swappedOrder = match.homeTeamId === stream.awayTeamId && match.awayTeamId === stream.homeTeamId;
      if (!sameOrder && !swappedOrder) return false;
      return daysBetween(toBrtCalendarDate(match.kickoffUtc), streamDate) <= DATE_TOLERANCE_DAYS;
    });

    if (candidates.length !== 1) {
      unresolvedCount++;
      continue;
    }
    matchIds.push(candidates[0].id);
  }

  return { matchIds, unresolvedCount };
}

/** Runs one channel end to end: fetch its upcoming streams -> match against already-ingested matches -> attach broadcasts -> record a scrape_runs row. A failing channel never throws past this point — the other tracked channels still run. */
async function runChannel(channel: (typeof TRACKED_CHANNELS)[number], apiKey: string, allMatches: MatchCandidate[]): Promise<void> {
  const startedAt = new Date().toISOString();

  try {
    const { streams, channelLogoUrl } = await fetchUpcomingStreams(channel.youtubeChannelId, apiKey);
    const { matchIds, unresolvedCount } = matchStreamsToBroadcasts(streams, allMatches);
    const now = new Date().toISOString();

    if (matchIds.length > 0) {
      const upserts = matchIds.map((matchId) =>
        db
          .insert(broadcasts)
          .values({
            id: `${matchId}__${channel.channelId}`,
            matchId,
            channelId: channel.channelId,
            logoUrl: channelLogoUrl ?? "",
            sourceId: channel.sourceId,
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: broadcasts.id,
            set: channelLogoUrl ? { logoUrl: channelLogoUrl } : {},
          }),
      );
      const [first, ...rest] = upserts;
      await db.batch([first, ...rest]);
    }

    await db.insert(scrapeRuns).values({
      sourceId: channel.sourceId,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: unresolvedCount === 0 ? "ok" : "partial",
      matchesFound: matchIds.length,
      matchesUnresolved: unresolvedCount,
    });

    console.log(`[${channel.sourceId}] attached ${matchIds.length} broadcasts (${unresolvedCount} unresolved)`);
  } catch (error) {
    await db.insert(scrapeRuns).values({
      sourceId: channel.sourceId,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      matchesFound: 0,
      matchesUnresolved: 0,
      errorMessage: getErrorMessage(error),
    });
    console.error(`[${channel.sourceId}] run failed:`, error);
  }
}

/** Enriches already-ingested matches with broadcasts from every tracked YouTube-only channel. A no-op (logged, not an error) if YOUTUBE_API_KEY isn't configured — same "degrade gracefully" pattern the Instagram poster uses for its own optional credentials. */
export async function runYoutubeEnrichment(): Promise<void> {
  if (!env.YOUTUBE_API_KEY) {
    console.log("[youtube] YOUTUBE_API_KEY not configured, skipping");
    return;
  }

  const allMatches = await db.select().from(matches);
  for (const channel of TRACKED_CHANNELS) {
    await runChannel(channel, env.YOUTUBE_API_KEY, allMatches);
  }
}
