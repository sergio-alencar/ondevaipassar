import { eq } from "drizzle-orm";
import { MAX_CAROUSELS_PER_RUN, MAX_STORIES_PER_DAY, pacingBlock, type PacingBlock, type RecentPost } from "./pacing.js";
import { groupIntoStories, type StoryGroup } from "./storyGroups.js";
import { isTodayInBrasilia, type MatchView } from "@ondevaipassar/shared";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { instagramPosts } from "../db/schema.js";
import { getErrorMessage } from "../lib/errors.js";
import { getMatchViews } from "../matches/getMatchViews.js";
import { buildCarouselCaption, buildDailyCaption } from "./caption.js";
import { isMediaNotFound, realGraphApiClient, type GraphApiClient } from "./graphApiClient.js";
import { DAILY_GROUP_ID, groupIntoDailyPosts, type PostGroup } from "./postGroups.js";
import { chunkIntoSlides, renderCarouselImages, renderStoryImage } from "./renderCarousel.js";


export interface PostingSummary {
  /** Carousels attempted, not matches — one post now covers a whole competition. */
  attempted: number;
  /** Carousels published. matchesPublished counts the matches inside them. */
  published: number;
  matchesPublished: number;
  failed: number;
  /** Errors thrown at or after the publish call — the post may well be live on Instagram, so these are never retried automatically. Needs a human to look at the account and either delete a stray post or reset the match (see /api/cron-instagram-reset). */
  unknown: number;
  /** Candidates this run didn't even get to (out of time) — 0 in the normal case. Rerun the endpoint to pick up where it left off; excludeAlreadyPublished means it's always safe to just call it again. */
  skipped: number;
  /**
   * Matches still unposted when this run ended, and the ONLY number a caller
   * should loop on: `skipped` (never attempted) plus every match in a group
   * that failed and is therefore eligible again. Deliberately excludes
   * `unknown` groups — those may already be live on Instagram, so they wait
   * for a human, not for a retry.
   *
   * Exists because the GitHub Actions loop used to exit on `skipped === 0`,
   * which is true whenever the run got through its whole list — including
   * when every group in it FAILED. Real bug, daily: a failing group made the
   * workflow report "all of today's matches posted" and exit 0, and Sérgio
   * had to trigger it by hand to get the rest out.
   */
  pending: number;
  /** True when Meta rate-limited/blocked the account mid-run. The run stops immediately: every further attempt would fail the same way, and each one risks another ambiguous "did that publish or not?" state. */
  blocked: boolean;
  /** Why nothing was posted this run when the account's own pacing said wait (see pacing.ts); null otherwise. */
  paced: PacingBlock | null;
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

/** Rows of stories live under their own ids ("story:<matchId>", in matchId too), so a story never counts as the match's feed post. */
export const STORY_ID_PREFIX = "story:";

/** Published rows of the last 24 hours, feed posts and stories apart (the gap between publications holds across both). */
async function recentPublications(): Promise<{ all: RecentPost[]; feed: RecentPost[]; stories: RecentPost[] }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const rows = (await db.select().from(instagramPosts).where(eq(instagramPosts.status, "published"))).filter(
    (post) => post.postedAt !== null && post.postedAt >= since,
  );
  const toRecent = (post: (typeof rows)[number]): RecentPost => ({ igMediaId: post.igMediaId, postedAt: post.postedAt as string });
  return {
    all: rows.map(toRecent),
    feed: rows.filter((post) => !post.id.startsWith(STORY_ID_PREFIX)).map(toRecent),
    stories: rows.filter((post) => post.id.startsWith(STORY_ID_PREFIX)).map(toRecent),
  };
}

/** Today's matches with a confirmed broadcast that have no story yet (published or unknown), whatever happened to their feed post. */
async function getStoryCandidates(): Promise<MatchView[]> {
  const todays = (await getMatchViews({})).filter((match) => isTodayInBrasilia(match.kickoffUtc) && match.broadcasts.length > 0);
  if (todays.length === 0) return [];
  const settled = new Set(
    (await db.select().from(instagramPosts))
      .filter((row) => row.id.startsWith(STORY_ID_PREFIX) && (row.status === "published" || row.status === "unknown"))
      .map((row) => row.id),
  );
  return todays.filter((match) => !settled.has(`${STORY_ID_PREFIX}${match.id}`));
}

/** The image of one story: the same render route Instagram fetches for slides. */
export function buildStoryPlan(story: StoryGroup): { imageUrl: string } {
  const query = new URLSearchParams({
    kind: "story",
    matchIds: story.matches.map((match) => match.id).join(","),
    competitionId: story.competitionId,
    v: String(Date.now()),
  });
  return { imageUrl: `${env.PUBLIC_BASE_URL}/api/instagram-slide?${query.toString()}` };
}

/** Every match today (BRT) that has at least one confirmed broadcast and hasn't already been posted — a match with no broadcast yet is skipped for the day, per product decision, no retry in v1. */
async function getCandidateMatches(): Promise<MatchView[]> {
  const matches = await getMatchViews({});
  const todaysMatches = matches.filter((match) => isTodayInBrasilia(match.kickoffUtc) && match.broadcasts.length > 0);
  return excludeAlreadyPublished(todaysMatches);
}

/**
 * What one post is made of: its caption and the URL of each image (cover, then
 * the slides). Instagram fetches those URLs itself; the daily e-mail shows the
 * very same ones, so what is reviewed is exactly what would be posted.
 */
export function buildPostPlan(group: PostGroup): { caption: string; imageUrls: string[] } {
  const caption =
    group.competitionId === DAILY_GROUP_ID
      ? buildDailyCaption(group.matches, group.part, group.totalParts)
      : buildCarouselCaption(group.competitionName, group.matches, group.part, group.totalParts);
  const slides = chunkIntoSlides(group.matches);
  // Every match on the slide is passed explicitly rather than the route
  // working the grouping out again — an ingest landing between this read
  // and Instagram's fetch would otherwise hand it a different slide than
  // the caption describes.
  //
  // The cache-busting `v` param isn't read by the route: a *re*-post of
  // the same matches (after fixing a rendering bug, say) needs a URL
  // Instagram has never fetched before. Confirmed live: a same-day repost
  // still went out with the old broken art, from Instagram's own cache of
  // the identical previous URL.
  const version = Date.now();
  const slideUrl = (params: Record<string, string>): string => {
    const query = new URLSearchParams({ ...params, competitionId: group.competitionId, v: String(version) });
    return `${env.PUBLIC_BASE_URL}/api/instagram-slide?${query.toString()}`;
  };
  const mixed = group.competitionId === DAILY_GROUP_ID || new Set(group.matches.map((match) => match.competitionId)).size > 1;

  const imageUrls = [
    slideUrl({ kind: "cover", matchIds: group.matches.map((match) => match.id).join(",") }),
    ...slides.map((slideMatches, index) =>
      slideUrl({
        kind: "slide",
        matchIds: slideMatches.map((match) => match.id).join(","),
        mixed: String(mixed),
        ...(slides.length > 1 ? { slideLabel: `${index + 1}/${slides.length}` } : {}),
      }),
    ),
  ];

  return { caption, imageUrls };
}

export interface RunPostingOptions {
  graphApi?: GraphApiClient;
  /** Restrict to exactly one match, bypassing the "today" + "has a broadcast" filter — for a controlled, single real test post before trusting the unattended daily run against every match. Still respects the already-published guard. */
  onlyMatchId?: string;
  /** Skip the feed post and run only the day's stories — for finishing the stories before a feed post is redone. */
  storiesOnly?: boolean;
}

export async function runInstagramPosting(options: RunPostingOptions = {}): Promise<PostingSummary> {
  const { graphApi = realGraphApiClient, onlyMatchId, storiesOnly = false } = options;
  const candidates = storiesOnly
    ? []
    : onlyMatchId
    ? await excludeAlreadyPublished(await getMatchViews({ id: onlyMatchId }))
    : await getCandidateMatches();
  const groups = groupIntoDailyPosts(candidates);
  const summary: PostingSummary = {
    attempted: 0,
    published: 0,
    matchesPublished: 0,
    failed: 0,
    unknown: 0,
    skipped: 0,
    pending: 0,
    blocked: false,
    paced: null,
  };
  const runStartedAt = Date.now();

  if (env.INSTAGRAM_PAUSED) {
    summary.paced = "paused";
    summary.skipped = groups.reduce((total, group) => total + group.matches.length, 0);
    summary.pending = summary.skipped;
    console.log(`[instagram] paused (INSTAGRAM_PAUSED): nothing is posted, ${summary.skipped} match(es) wait`);
    return summary;
  }

  // Pacing (pacing.ts): a real publication is never started too soon after the
  // last one, nor past the day's cap. A dry run writes nothing, so it is exempt.
  if (!env.INSTAGRAM_DRY_RUN && groups.length > 0) {
    const recent = await recentPublications();
    const block = pacingBlock(recent.feed, Date.now(), recent.all);
    if (block) {
      summary.paced = block;
      summary.skipped = groups.reduce((total, group) => total + group.matches.length, 0);
      summary.pending = summary.skipped;
      console.log(`[instagram] pacing (${block}): not posting now, ${summary.skipped} match(es) wait`);
      return summary;
    }
  }

  // No feed post pending: the day's stories, one per run.
  if (groups.length === 0 && !onlyMatchId) return runNextStory(summary, graphApi);

  const remainingMatches = (postsDone: number): number =>
    groups.slice(postsDone).reduce((total, group) => total + group.matches.length, 0);
  // Matches in groups that failed outright. They have a "failed" row in
  // instagram_posts, which excludeAlreadyPublished lets through again, so
  // the very next call retries them — they are pending work, not done work.
  let failedMatches = 0;

  for (const group of groups) {
    // One carousel per run; the next trigger takes the next one.
    if (!env.INSTAGRAM_DRY_RUN && summary.attempted >= MAX_CAROUSELS_PER_RUN) {
      summary.skipped = remainingMatches(summary.attempted);
      break;
    }
    // Stop BEFORE starting a post we may not be able to finish - a
    // half-built carousel leaves orphan containers and, worse, an
    // ambiguous publish. The next run picks these up: every match still
    // has no instagram_posts row, so excludeAlreadyPublished lets them
    // through again.
    if (Date.now() - runStartedAt > TIME_BUDGET_MS) {
      summary.skipped = remainingMatches(summary.attempted);
      console.log(`[instagram] time budget reached, stopping early with ${summary.skipped} match(es) left for next run`);
      break;
    }
    summary.attempted++;

    const { caption, imageUrls } = buildPostPlan(group);

    if (env.INSTAGRAM_DRY_RUN) {
      // Exercises the real rendering path (catches template/asset errors)
      // without ever touching the Graph API or writing DB state - safe to
      // run repeatedly against real data.
      const rendered = await renderCarouselImages(group.competitionId, group.matches);
      console.log(
        `[instagram dry-run] ${group.competitionId}: ${rendered.length} images (${rendered.map((png) => png.length).join(", ")} bytes)\n${caption}`,
      );
      summary.published++;
      summary.matchesPublished += group.matches.length;
      continue;
    }

    // Which step we're on, so a failure can be classified. Everything up to
    // and including "publish" is the dangerous part: once media_publish has
    // been called we can no longer tell from an error alone whether the post
    // went live (Meta can reject the call and still publish, which is how a
    // single blocked account turned into dozens of duplicates).
    let phase: "create" | "poll" | "publish" | "record" = "create";
    try {
      const childIds: string[] = [];
      for (const imageUrl of imageUrls) {
        childIds.push(await graphApi.createCarouselItem(imageUrl));
      }
      phase = "poll";
      for (const childId of childIds) {
        await graphApi.pollUntilFinished(childId);
      }

      phase = "create";
      // Always a carousel: the cover is an image of its own, so even a
      // group of one match is cover + 1 slide = 2 items, which clears
      // Meta's minimum. There used to be a single-image branch here for
      // "a lone match", but it could never run — and its comment claimed
      // the opposite of what the pipeline actually did.
      const containerId = await graphApi.createCarousel(childIds, caption);
      phase = "poll";
      await graphApi.pollUntilFinished(containerId);
      phase = "publish";
      const igMediaId = await graphApi.publishContainer(containerId);
      phase = "record";

      // One row per match, all sharing the carousel's media id: the
      // already-posted guard and /api/cron-instagram-reset both work per
      // match and stay unchanged by the switch to grouped posts.
      const now = new Date().toISOString();
      const rows = group.matches.map((match) =>
        db
          .insert(instagramPosts)
          .values({ id: match.id, matchId: match.id, status: "published", igMediaId, postedAt: now, createdAt: now })
          .onConflictDoUpdate({
            target: instagramPosts.id,
            set: { status: "published", igMediaId, postedAt: now, errorMessage: null },
          }),
      );
      const [first, ...rest] = rows;
      await db.batch([first, ...rest]);

      summary.published++;
      summary.matchesPublished += group.matches.length;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      // "Media Not Found" at publish means the container never existed: nothing is live, so it is a plain failure to retry, not "unknown".
    const ambiguous = (phase === "publish" || phase === "record") && !isMediaNotFound(error);
      const status = ambiguous ? "unknown" : "failed";

      const now = new Date().toISOString();
      const rows = group.matches.map((match) =>
        db
          .insert(instagramPosts)
          .values({ id: match.id, matchId: match.id, status, errorMessage, createdAt: now })
          .onConflictDoUpdate({ target: instagramPosts.id, set: { status, errorMessage } }),
      );
      const [first, ...rest] = rows;
      await db.batch([first, ...rest]);

      console.error(`[instagram] ${status} while posting ${group.competitionId} (phase: ${phase}):`, error);
      if (ambiguous) {
        summary.unknown++;
      } else {
        summary.failed++;
        failedMatches += group.matches.length;
      }

      if (isRateLimited(error)) {
        // Every remaining post would hit the same block, and each one risks
        // another ambiguous state. Stop the whole run and let the caller
        // (the GitHub Actions loop) see `blocked` and stop retrying.
        summary.blocked = true;
        summary.skipped = remainingMatches(summary.attempted);
        console.error(`[instagram] rate-limited by Meta, aborting run with ${summary.skipped} match(es) untouched`);
        break;
      }
    }
  }

  summary.pending = summary.skipped + failedMatches;
  console.log(`[instagram] run summary: ${JSON.stringify(summary)}`);
  return summary;
}

/**
 * Publishes the next story, if one is due and the pacing allows it. One story
 * per run, with the same 15-minute gap as the feed posts (counted across both),
 * so a morning of stories is spread out like a person's, not fired in a burst.
 * A story is a single image published on its own, so there is no carousel step:
 * container, wait until processed, publish, record. The same ambiguity rule as
 * the feed applies: an error at or after the publish call may mean it is live,
 * and that story is never retried until a human looks.
 */
async function runNextStory(summary: PostingSummary, graphApi: GraphApiClient): Promise<PostingSummary> {
  const stories = groupIntoStories(await getStoryCandidates());
  if (stories.length === 0) return summary;
  const storyMatches = (list: StoryGroup[]): number => list.reduce((total, story) => total + story.matches.length, 0);

  if (!env.INSTAGRAM_DRY_RUN) {
    const recent = await recentPublications();
    const block = pacingBlock(recent.stories, Date.now(), recent.all, MAX_STORIES_PER_DAY);
    if (block) {
      summary.paced = block;
      summary.skipped = storyMatches(stories);
      summary.pending = summary.skipped;
      console.log(`[instagram] story pacing (${block}): not posting now, ${stories.length} story(ies) wait`);
      return summary;
    }
  }

  const [story, ...rest] = stories;
  summary.attempted++;
  const { imageUrl } = buildStoryPlan(story);

  if (env.INSTAGRAM_DRY_RUN) {
    const rendered = await renderStoryImage(story.competitionId, story.matches);
    console.log(`[instagram dry-run] story ${story.competitionId}: ${rendered.length} bytes`);
    summary.published++;
    summary.matchesPublished += story.matches.length;
    summary.pending = storyMatches(rest);
    summary.skipped = summary.pending;
    return summary;
  }

  let phase: "create" | "poll" | "publish" | "record" = "create";
  try {
    const containerId = await graphApi.createStory(imageUrl);
    phase = "poll";
    await graphApi.pollUntilFinished(containerId);
    phase = "publish";
    const igMediaId = await graphApi.publishContainer(containerId);
    phase = "record";
    const now = new Date().toISOString();
    const rows = story.matches.map((match) =>
      db
        .insert(instagramPosts)
        .values({ id: `${STORY_ID_PREFIX}${match.id}`, matchId: `${STORY_ID_PREFIX}${match.id}`, status: "published", igMediaId, postedAt: now, createdAt: now })
        .onConflictDoUpdate({ target: instagramPosts.id, set: { status: "published", igMediaId, postedAt: now, errorMessage: null } }),
    );
    const [first, ...others] = rows;
    await db.batch([first, ...others]);
    summary.published++;
    summary.matchesPublished += story.matches.length;
  } catch (error) {
    // "Media Not Found" at publish means the container never existed: nothing is live, so it is a plain failure to retry, not "unknown".
    const ambiguous = (phase === "publish" || phase === "record") && !isMediaNotFound(error);
    const status = ambiguous ? "unknown" : "failed";
    const now = new Date().toISOString();
    const rows = story.matches.map((match) =>
      db
        .insert(instagramPosts)
        .values({ id: `${STORY_ID_PREFIX}${match.id}`, matchId: `${STORY_ID_PREFIX}${match.id}`, status, errorMessage: getErrorMessage(error), createdAt: now })
        .onConflictDoUpdate({ target: instagramPosts.id, set: { status, errorMessage: getErrorMessage(error) } }),
    );
    const [first, ...others] = rows;
    await db.batch([first, ...others]);
    console.error(`[instagram] story ${status} (${story.competitionId}, phase ${phase}):`, error);
    if (ambiguous) summary.unknown++;
    else summary.failed++;
    if (isRateLimited(error)) summary.blocked = true;
  }

  // Everything not published this run waits for the next: the failed story is pending work, the rest not yet reached.
  summary.skipped = storyMatches(rest);
  summary.pending = summary.skipped + (summary.failed > 0 ? story.matches.length : 0);
  return summary;
}

/** Today's posts exactly as the poster would make them, whether or not anything is being posted: the daily e-mail's content (the feed post first, then the stories). */
export async function getTodaysPostPlans(
  options: { includePosted?: boolean } = {},
): Promise<{ kind: "feed" | "story"; title: string; matchCount: number; caption: string; imageUrls: string[] }[]> {
  // includePosted: today's matches that already went out too — for testing the e-mail on a day with nothing left to post.
  const todays = async (): Promise<MatchView[]> =>
    (await getMatchViews({})).filter((match) => isTodayInBrasilia(match.kickoffUtc) && match.broadcasts.length > 0);

  const feedMatches = options.includePosted ? await todays() : await getCandidateMatches();
  const storyMatches = options.includePosted ? await todays() : await getStoryCandidates();

  return [
    ...groupIntoDailyPosts(feedMatches).map((group) => ({
      kind: "feed" as const,
      title: group.totalParts > 1 ? `${group.competitionName} (${group.part}/${group.totalParts})` : group.competitionName,
      matchCount: group.matches.length,
      ...buildPostPlan(group),
    })),
    ...groupIntoStories(storyMatches).map((story) => ({
      kind: "story" as const,
      title: `Story: ${story.competitionName}`,
      matchCount: story.matches.length,
      caption: "",
      imageUrls: [buildStoryPlan(story).imageUrl],
    })),
  ];
}

export { groupIntoStories };
