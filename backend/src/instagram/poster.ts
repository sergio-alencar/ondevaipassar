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
  /** Errors thrown at or after the publish call — the post may well be live on Instagram, so these are never retried automatically. Needs a human to look at the account and either delete a stray post or reset the match (see /api/cron-instagram-reset). */
  unknown: number;
  /** Candidates this run didn't even get to (out of time) — 0 in the normal case. Rerun the endpoint to pick up where it left off; excludeAlreadyPublished means it's always safe to just call it again. */
  skipped: number;
  /** True when Meta rate-limited/blocked the account mid-run. The run stops immediately: every further attempt would fail the same way, and each one risks another ambiguous "did that publish or not?" state. */
  blocked: boolean;
}

// Vercel kills the whole function invocation mid-flight once its own
// maxDuration is up — no exception to catch, no chance to record anything
// for whatever match was mid-post at that instant, which is exactly what
// caused a real production bug (7 of 15 tracked matches posted, the rest
// just vanished with no error logged). maxDuration is configured to 60s
// (see backend/vercel.json) — this budget deliberately stays well under
// that, so there's still time left to finish whatever match is already
// in flight (create -> poll -> publish -> DB write) plus return a response,
// instead of stopping so late the platform kills it anyway.
const TIME_BUDGET_MS = 45000;

// Meta returns this when the account has tripped its content-publishing
// rate limit ("action is blocked - We restrict certain activity to protect
// our community"). Real incident it comes from: 15 retry attempts in a row
// against an already-blocked account, every one of them reported
// failed/published:0 by us while posts kept appearing on the account —
// dozens of duplicates Sérgio had to delete by hand.
export function isRateLimited(error: unknown): boolean {
  const message = getErrorMessage(error);
  return message.includes('"code":4') || message.includes("Application request limit reached") || message.includes("action is blocked");
}

/**
 * Matches we must not post again. "published" is the obvious one;
 * "unknown" is the one that matters — an error at or after the publish
 * call leaves the post possibly live, and automatically retrying those is
 * exactly what produced the duplicate storm. They stay excluded until a
 * human resets them (see /api/cron-instagram-reset).
 */
async function excludeAlreadyPublished(matches: MatchView[]): Promise<MatchView[]> {
  if (matches.length === 0) return [];
  const settled = new Set(
    (await db.select().from(instagramPosts))
      .filter((row) => row.status === "published" || row.status === "unknown")
      .map((row) => row.matchId),
  );
  return matches.filter((match) => !settled.has(match.id));
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
  const summary: PostingSummary = { attempted: 0, published: 0, failed: 0, unknown: 0, skipped: 0, blocked: false };
  const runStartedAt = Date.now();

  for (const match of candidates) {
    // Stop BEFORE starting a new match, not after — half-starting one we
    // don't have time to finish is worse than just leaving it for the next
    // run (which excludeAlreadyPublished makes safe to trigger any time).
    if (Date.now() - runStartedAt > TIME_BUDGET_MS) {
      summary.skipped = candidates.length - summary.attempted;
      console.log(`[instagram] time budget reached, stopping early with ${summary.skipped} candidate(s) left for next run`);
      break;
    }
    summary.attempted++;

    const caption = buildCaption(match);
    // The cache-busting `v` param isn't read by the route — it's there so
    // a *re*-post of the same match (e.g. after fixing a rendering bug and
    // manually deleting/redoing a bad post) gets a URL Instagram has never
    // fetched before. Confirmed live: a same-day repost of an
    // already-fixed match still went out with the old broken art, because
    // Instagram's own fetch of the identical previous URL was cached.
    const imageUrl = `${env.PUBLIC_BASE_URL}/api/instagram-preview?matchId=${encodeURIComponent(match.id)}&v=${Date.now()}`;

    if (env.INSTAGRAM_DRY_RUN) {
      // Exercises the real rendering path (catches template/asset errors)
      // without ever touching the Graph API or writing DB state — safe to
      // run repeatedly against real data.
      const png = await renderMatchImage(match);
      console.log(`[instagram dry-run] ${match.id}: rendered ${png.length} bytes\n${caption}\nimage: ${imageUrl}`);
      summary.published++;
      continue;
    }

    // Which step we're on, so a failure can be classified. Everything up to
    // and including "publish" is the dangerous part: once media_publish has
    // been called we can no longer tell from an error alone whether the post
    // went live (Meta can reject the call and still publish, which is how a
    // single blocked account turned into dozens of duplicates).
    let phase: "create" | "poll" | "publish" | "record" = "create";
    try {
      const containerId = await graphApi.createContainer(imageUrl, caption);
      phase = "poll";
      await graphApi.pollUntilFinished(containerId);
      phase = "publish";
      const igMediaId = await graphApi.publishContainer(containerId);
      phase = "record";

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
      const ambiguous = phase === "publish" || phase === "record";
      const status = ambiguous ? "unknown" : "failed";

      await db
        .insert(instagramPosts)
        .values({ id: match.id, matchId: match.id, status, errorMessage, createdAt: new Date().toISOString() })
        .onConflictDoUpdate({ target: instagramPosts.id, set: { status, errorMessage } });
      console.error(`[instagram] ${status} while posting match ${match.id} (phase: ${phase}):`, error);
      if (ambiguous) summary.unknown++;
      else summary.failed++;

      if (isRateLimited(error)) {
        // Every remaining candidate would hit the same block, and each one
        // risks another ambiguous state. Stop the whole run and let the
        // caller (the GitHub Actions loop) see `blocked` and stop retrying.
        summary.blocked = true;
        summary.skipped = candidates.length - summary.attempted;
        console.error(`[instagram] rate-limited by Meta, aborting run with ${summary.skipped} candidate(s) untouched`);
        break;
      }
    }
  }

  console.log(`[instagram] run summary: ${JSON.stringify(summary)}`);
  return summary;
}
