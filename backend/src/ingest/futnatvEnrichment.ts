import { resolveChannelId } from "@ondevaipassar/shared";
import { db } from "../db/client.js";
import { broadcasts, matches, scrapeRuns } from "../db/schema.js";
import { parseBroadcastChannels } from "../sources/futnatv/broadcastText.js";
import { fetchAllUpcomingGames } from "../sources/futnatv/client.js";
import { runBroadcastSource } from "./attachBroadcasts.js";
import { matchStreamsToBroadcasts, type MatchCandidate } from "./broadcastMatching.js";
import { resolveTeamId } from "./teamResolver.js";

const SOURCE_ID = "futnatv";
const KICKOFF_TIME_PATTERN = /^(\d{1,2})h(\d{2})$/;

function toKickoffUtc(dateKey: string, time: string): string | null {
  const timeMatch = time.match(KICKOFF_TIME_PATTERN);
  if (!timeMatch) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;

  const [, hourStr, minuteStr] = timeMatch;
  // Brazil has used a fixed UTC-3 offset (no DST) since 2019 — same
  // assumption used throughout this codebase for a BRT-labeled time.
  const parsed = new Date(Date.UTC(year, month - 1, day, Number(hourStr) + 3, Number(minuteStr)));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Supplementary source, additive-only, same spirit as itatiaia/meuguia:
 * futnatv.net publishes a genuinely rich per-day schedule across every
 * league it covers (confirmed live: 25+ games/day, spanning everything
 * from Brasileirão to obscure foreign second divisions), each with its own
 * free-text broadcast field AND — uniquely among this project's sources —
 * a direct link to that specific match's own YouTube stream where one
 * exists, no YOUTUBE_API_KEY required (unlike youtubeEnrichment.ts's own
 * deep-link feature).
 */
export async function runFutnatvEnrichment(): Promise<void> {
  const startedAt = new Date().toISOString();

  await runBroadcastSource(SOURCE_ID, async () => {
    const allMatches: MatchCandidate[] = await db.select().from(matches);
    const datedGames = await fetchAllUpcomingGames();

    const resolved: { matchId: string; channelId: string; watchUrl: string | null }[] = [];
    let unresolvedCount = 0;

    for (const { game, dateKey } of datedGames) {
      const streamDateUtc = toKickoffUtc(dateKey, game.time);
      if (!streamDateUtc) {
        unresolvedCount++;
        continue;
      }

      const homeTeamId = resolveTeamId(game.home);
      const awayTeamId = resolveTeamId(game.away);
      if (!homeTeamId && !awayTeamId) continue; // not a team we track at all — not our concern, doesn't count against run health

      const { matchIds } = matchStreamsToBroadcasts([{ homeTeamId, awayTeamId, streamDateUtc }], allMatches);
      if (matchIds.length !== 1) {
        unresolvedCount++;
        continue;
      }

      const byChannelId = new Map<string, string | null>();
      for (const { channelNameRaw, watchUrl } of parseBroadcastChannels(game.broadcast, game.youtubeUrl ?? null)) {
        const channelId = resolveChannelId(channelNameRaw);
        if (!channelId) continue;
        const existing = byChannelId.get(channelId);
        // The same channel is sometimes mentioned twice in one string (e.g.
        // "NSports, YouTube (NSports) e Disney+") — keep whichever mention
        // actually carries a watch link.
        if (existing === undefined || (!existing && watchUrl)) byChannelId.set(channelId, watchUrl);
      }
      if (byChannelId.size === 0) {
        unresolvedCount++;
        continue;
      }

      for (const [channelId, watchUrl] of byChannelId) {
        resolved.push({ matchId: matchIds[0], channelId, watchUrl });
      }
    }

    const now = new Date().toISOString();
    const upserts = resolved.map(({ matchId, channelId, watchUrl }) =>
      db
        .insert(broadcasts)
        .values({ id: `${matchId}__${channelId}`, matchId, channelId, logoUrl: "", watchUrl, sourceId: SOURCE_ID, createdAt: now })
        .onConflictDoNothing({ target: broadcasts.id }),
    );

    if (upserts.length > 0) {
      const [first, ...rest] = upserts;
      await db.batch([first, ...rest]);
    }

    await db.insert(scrapeRuns).values({
      sourceId: SOURCE_ID,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: unresolvedCount === 0 ? "ok" : "partial",
      matchesFound: resolved.length,
      matchesUnresolved: unresolvedCount,
    });

    console.log(`[${SOURCE_ID}] attached ${resolved.length} channel mentions (${unresolvedCount} unresolved)`);
  });
}
