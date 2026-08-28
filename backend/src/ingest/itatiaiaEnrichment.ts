import { resolveChannelId } from "@ondevaipassar/shared";
import { db } from "../db/client.js";
import { broadcasts, matches, scrapeRuns } from "../db/schema.js";
import { getErrorMessage } from "../lib/errors.js";
import { fetchArticleCandidate } from "../sources/itatiaia/article.js";
import { fetchCandidateArticleUrls } from "../sources/itatiaia/client.js";
import { runBroadcastSource } from "./attachBroadcasts.js";
import { matchStreamsToBroadcasts, type MatchCandidate } from "./broadcastMatching.js";
import { resolveTeamId } from "./teamResolver.js";

const SOURCE_ID = "itatiaia";
const CONCURRENCY = 5;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

type ArticleResult = { matchId: string; channelIds: string[] } | { unresolved: true } | null;

async function resolveArticle(url: string, allMatches: MatchCandidate[]): Promise<ArticleResult> {
  const article = await fetchArticleCandidate(url);
  if (!article) return null; // not a preview article — doesn't count against run health

  const { candidate, channelNames } = article;
  if (channelNames.length === 0) return { unresolved: true };

  const homeTeamId = resolveTeamId(candidate.homeTeamNameRaw);
  const awayTeamId = resolveTeamId(candidate.awayTeamNameRaw);
  if (!homeTeamId && !awayTeamId) return { unresolved: true };

  const { matchIds } = matchStreamsToBroadcasts([{ homeTeamId, awayTeamId, streamDateUtc: candidate.dateUtc }], allMatches);
  if (matchIds.length !== 1) return { unresolved: true };

  const channelIds = [...new Set(channelNames.map(resolveChannelId).filter((id): id is string => id !== null))];
  if (channelIds.length === 0) return { unresolved: true };

  return { matchId: matchIds[0], channelIds };
}

/**
 * Supplementary source for the "Europa" division, additive-only, same shape
 * as futebolInteriorEnrichment.ts/tudoSobrePaulistaEnrichment.ts:
 * ge.globo's own per-team agenda data covers foreign leagues weakly (only 4
 * of 20 tracked clubs have a working agenda page at all — see
 * ge-globo/client.ts) or incompletely even when it does (confirmed live:
 * Arsenal's own agenda listed only Disney+ for a match ESPN also
 * simulcasts). itatiaia.com.br publishes a dedicated preview article per
 * European match with its own "Streaming"/"YouTube" broadcast fields —
 * discovered via each tracked league's own sub-hub, same pattern as the
 * other two article-based sources.
 */
export async function runItatiaiaEnrichment(): Promise<void> {
  const startedAt = new Date().toISOString();

  await runBroadcastSource(SOURCE_ID, async () => {
    const allMatches: MatchCandidate[] = await db.select().from(matches);
    const urls = await fetchCandidateArticleUrls();

    const resolvedArticles: { matchId: string; channelIds: string[] }[] = [];
    let unresolvedCount = 0;

    for (const batch of chunk(urls, CONCURRENCY)) {
      const results = await Promise.all(
        batch.map((url) =>
          resolveArticle(url, allMatches).catch((error) => {
            console.error(`[${SOURCE_ID}] failed to fetch article ${url}:`, getErrorMessage(error));
            return { unresolved: true as const };
          }),
        ),
      );
      for (const result of results) {
        if (!result) continue;
        if ("unresolved" in result) unresolvedCount++;
        else resolvedArticles.push(result);
      }
    }

    const now = new Date().toISOString();
    const upserts = resolvedArticles.flatMap(({ matchId, channelIds }) =>
      channelIds.map((channelId) =>
        db
          .insert(broadcasts)
          .values({ id: `${matchId}__${channelId}`, matchId, channelId, logoUrl: "", sourceId: SOURCE_ID, createdAt: now })
          .onConflictDoNothing({ target: broadcasts.id }),
      ),
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
      matchesFound: resolvedArticles.length,
      matchesUnresolved: unresolvedCount,
    });

    console.log(`[${SOURCE_ID}] attached channels for ${resolvedArticles.length} matches (${unresolvedCount} unresolved)`);
  });
}
