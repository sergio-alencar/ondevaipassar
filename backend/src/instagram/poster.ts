import { isTodayInBrasilia, type MatchView } from "@ondevaipassar/shared";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { instagramPosts } from "../db/schema.js";
import { getErrorMessage } from "../lib/errors.js";
import { getMatchViews } from "../matches/getMatchViews.js";
import { buildCaption } from "./caption.js";
import { realGraphApiClient, type GraphApiClient } from "./graphApiClient.js";
import { renderMatchImage } from "./renderImage.js";

export interface PostingSummary {
  attempted: number;
  published: number;
  failed: number;
}

async function excludeAlreadyPublished(matches: MatchView[]): Promise<MatchView[]> {
  if (matches.length === 0) return [];
  const alreadyPublished = new Set(
    (await db.select().from(instagramPosts)).filter((row) => row.status === "published").map((row) => row.matchId),
  );
  return matches.filter((match) => !alreadyPublished.has(match.id));
}

/** Every match today (BRT) that has at least one confirmed broadcast and hasn't already been posted — a match with no broadcast yet is skipped for the day, per product decision, no retry in v1. */
async function getCandidateMatches(): Promise<MatchView[]> {
  const matches = await getMatchViews({});
  const todaysMatches = matches.filter((match) => isTodayInBrasilia(match.kickoffUtc) && match.broadcasts.length > 0);
  return excludeAlreadyPublished(todaysMatches);
}

export interface RunPostingOptions {
  graphApi?: GraphApiClient;
  /** Restrict to exactly one match, bypassing the "today" + "has a broadcast" filter — for a controlled, single real test post before trusting the unattended daily run against every match. Still respects the already-published guard. */
  onlyMatchId?: string;
}

export async function runInstagramPosting(options: RunPostingOptions = {}): Promise<PostingSummary> {
  const { graphApi = realGraphApiClient, onlyMatchId } = options;
  const candidates = onlyMatchId
    ? await excludeAlreadyPublished(await getMatchViews({ id: onlyMatchId }))
    : await getCandidateMatches();
  const summary: PostingSummary = { attempted: candidates.length, published: 0, failed: 0 };

  for (const match of candidates) {
    const caption = buildCaption(match);
    const imageUrl = `${env.PUBLIC_BASE_URL}/api/instagram/preview/${match.id}`;

    if (env.INSTAGRAM_DRY_RUN) {
      // Exercises the real rendering path (catches template/asset errors)
      // without ever touching the Graph API or writing DB state — safe to
      // run repeatedly against real data.
      const png = await renderMatchImage(match);
      console.log(`[instagram dry-run] ${match.id}: rendered ${png.length} bytes\n${caption}\nimage: ${imageUrl}`);
      summary.published++;
      continue;
    }

    try {
      const containerId = await graphApi.createContainer(imageUrl, caption);
      await graphApi.pollUntilFinished(containerId);
      const igMediaId = await graphApi.publishContainer(containerId);

      await db
        .insert(instagramPosts)
        .values({
          id: match.id,
          matchId: match.id,
          status: "published",
          igMediaId,
          postedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: instagramPosts.id,
          set: { status: "published", igMediaId, postedAt: new Date().toISOString(), errorMessage: null },
        });
      summary.published++;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      await db
        .insert(instagramPosts)
        .values({ id: match.id, matchId: match.id, status: "failed", errorMessage, createdAt: new Date().toISOString() })
        .onConflictDoUpdate({ target: instagramPosts.id, set: { status: "failed", errorMessage } });
      console.error(`[instagram] failed to post match ${match.id}:`, error);
      summary.failed++;
    }
  }

  console.log(`[instagram] run summary: ${JSON.stringify(summary)}`);
  return summary;
}
