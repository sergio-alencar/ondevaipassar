/**
 * How fast the account is allowed to post. Instagram flagged the account for
 * "automated behavior" after days when a dozen carousels went out within a
 * minute or two, with deletions and re-posts in between: a person doesn't
 * publish that way. The API allows far more than this; the limits here are
 * about what the account's own integrity checks consider normal.
 *
 * Enforced on the server (not in whatever calls the endpoint), so a late
 * workflow, a manual trigger and the Vercel cron can all fire without ever
 * adding up to a burst.
 */

/** Carousels per run: the rest waits for the next trigger. */
export const MAX_CAROUSELS_PER_RUN = 1;
/** Minimum time between two publications. */
export const MIN_GAP_BETWEEN_POSTS_MS = 15 * 60 * 1000;
/** Carousels in any rolling 24 hours. A busy day's lowest-priority groups are simply not posted. */
export const MAX_CAROUSELS_PER_DAY = 6;

/** Stories in any rolling 24 hours (one per competition, so a busy day has many). Their gap is the same 15 minutes as the posts'. */
export const MAX_STORIES_PER_DAY = 12;

export type PacingBlock = "too-soon" | "daily-cap" | "paused";

export interface RecentPost {
  igMediaId: string | null;
  /** ISO time it went live. */
  postedAt: string;
}

/**
 * Null when posting is allowed now; otherwise why not. `recent` is what counts against the cap (published in the
 * last 24 hours: one row per match, so several rows can share one carousel or story); `all` is everything
 * published, feed posts AND stories, because the gap between two publications holds across both.
 */
export function pacingBlock(
  recent: RecentPost[],
  now: number = Date.now(),
  all: RecentPost[] = recent,
  cap: number = MAX_CAROUSELS_PER_DAY,
): PacingBlock | null {
  const publications = new Set(recent.map((post) => post.igMediaId ?? post.postedAt));
  if (publications.size >= cap) return "daily-cap";
  const latest = all.reduce((most, post) => Math.max(most, Date.parse(post.postedAt)), 0);
  if (latest > 0 && now - latest < MIN_GAP_BETWEEN_POSTS_MS) return "too-soon";
  return null;
}
