import { resolveChannelId, TEAMS } from "@ondevaipassar/shared";
import { db } from "../db/client.js";
import { broadcasts, matches, scrapeRuns } from "../db/schema.js";
import { getErrorMessage } from "../lib/errors.js";
import { fetchConfirmedChannelNames, parseArticleCandidate } from "../sources/ge-globo/ondeAssistirArticle.js";
import { fetchTeamNewsFeed } from "../sources/ge-globo/newsFeedClient.js";
import { matchStreamsToBroadcasts, type MatchCandidate } from "./broadcastMatching.js";
import { runBroadcastSource } from "./attachBroadcasts.js";
import { resolveTeamId } from "./teamResolver.js";

const SOURCE_ID = "ge-globo-onde-assistir";
const CONCURRENCY = 5;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Scans one team's ge.globo news feed for "onde assistir" preview articles
 * and resolves each to an already-ingested match id, keyed by article url.
 * A feed item that isn't one of these previews (most of them) is silently
 * skipped, not counted as unresolved — only a genuine preview article whose
 * teams/date we couldn't match counts against the run's health.
 */
async function findArticlesForTeam(
  geGloboSlug: string,
  allMatches: MatchCandidate[],
): Promise<{ found: Map<string, string>; unresolvedCount: number }> {
  const found = new Map<string, string>();
  let unresolvedCount = 0;

  const items = await fetchTeamNewsFeed(geGloboSlug);
  for (const item of items) {
    const candidate = parseArticleCandidate(item);
    if (!candidate) continue;

    const homeTeamId = resolveTeamId(candidate.homeTeamNameRaw);
    const awayTeamId = resolveTeamId(candidate.awayTeamNameRaw);
    if (!homeTeamId || !awayTeamId) {
      unresolvedCount++;
      continue;
    }

    const { matchIds } = matchStreamsToBroadcasts([{ homeTeamId, awayTeamId, streamDateUtc: candidate.dateUtc }], allMatches);
    if (matchIds.length !== 1) {
      unresolvedCount++;
      continue;
    }

    found.set(matchIds[0], candidate.url);
  }

  return { found, unresolvedCount };
}

/**
 * Supplementary source, additive-only, same spirit as premiereEnrichment.ts
 * and youtubeEnrichment.ts: ge.globo's own per-team agenda JSON (the
 * primary ge-globo source) sometimes just doesn't list every confirmed
 * channel — e.g. it named only Disney+ for Goiás x São Bernardo while
 * ge.globo's own human-written preview article for the same match named
 * ESPN too. That article isn't linked from the agenda page at all; it only
 * shows up in each team's own news-feed page, so this scans those feeds for
 * the preview article, then reads its "Transmissão: X e Y." line as an
 * additional confirmed-channel signal. Never removes what the primary
 * source already found (broadcasts.id is `${matchId}__${channelId}`,
 * per-channel — this only ever adds rows for channels not already present
 * under any sourceId, via onConflictDoNothing).
 */
export async function runOndeAssistirEnrichment(): Promise<void> {
  const startedAt = new Date().toISOString();

  await runBroadcastSource(SOURCE_ID, async () => {
    const allMatches: MatchCandidate[] = await db.select().from(matches);
    const teamsWithSlug = TEAMS.filter(
      (team): team is typeof team & { aliases: { geGlobo: string } } => team.aliases.geGlobo !== null,
    );

    const articleByMatchId = new Map<string, string>();
    let unresolvedCount = 0;

    for (const batch of chunk(teamsWithSlug, CONCURRENCY)) {
      await Promise.all(
        batch.map(async (team) => {
          try {
            const { found, unresolvedCount: teamUnresolved } = await findArticlesForTeam(team.aliases.geGlobo, allMatches);
            unresolvedCount += teamUnresolved;
            for (const [matchId, url] of found) articleByMatchId.set(matchId, url);
          } catch (error) {
            console.error(`[${SOURCE_ID}] failed to fetch news feed for ${team.id}:`, getErrorMessage(error));
            unresolvedCount++;
          }
        }),
      );
    }

    const articleEntries = [...articleByMatchId.entries()];
    const resolvedArticles: { matchId: string; channelIds: string[] }[] = [];

    for (const entryBatch of chunk(articleEntries, CONCURRENCY)) {
      const batchResults = await Promise.all(
        entryBatch.map(async ([matchId, articleUrl]) => {
          try {
            const channelNames = await fetchConfirmedChannelNames(articleUrl);
            const channelIds = [...new Set(channelNames.map(resolveChannelId).filter((id): id is string => id !== null))];
            return channelIds.length > 0 ? { matchId, channelIds } : null;
          } catch (error) {
            console.error(`[${SOURCE_ID}] failed to fetch article ${articleUrl}:`, getErrorMessage(error));
            return null;
          }
        }),
      );
      for (const result of batchResults) {
        if (result) resolvedArticles.push(result);
        else unresolvedCount++;
      }
    }

    const now = new Date().toISOString();
    const upserts = resolvedArticles.flatMap(({ matchId, channelIds }) =>
      channelIds.map((channelId) =>
        db
          .insert(broadcasts)
          .values({
            id: `${matchId}__${channelId}`,
            matchId,
            channelId,
            logoUrl: "",
            sourceId: SOURCE_ID,
            createdAt: now,
          })
          .onConflictDoNothing({ target: broadcasts.id }),
      ),
    );
    const attachedCount = resolvedArticles.length;

    if (upserts.length > 0) {
      const [first, ...rest] = upserts;
      await db.batch([first, ...rest]);
    }

    await db.insert(scrapeRuns).values({
      sourceId: SOURCE_ID,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: unresolvedCount === 0 ? "ok" : "partial",
      matchesFound: attachedCount,
      matchesUnresolved: unresolvedCount,
    });

    console.log(`[${SOURCE_ID}] attached channels for ${attachedCount} matches (${unresolvedCount} unresolved)`);
  });
}
