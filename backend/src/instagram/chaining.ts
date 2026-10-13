import type { PostingSummary } from "./poster.js";

/** A day's whole list is ~15 carousels at ~2 per call, so this is generous; it only exists so a bug can never make the endpoint call itself forever. */
export const MAX_CHAIN_DEPTH = 10;

/**
 * Whether a posting run should start the next one itself. One call has a 60 s
 * ceiling and posts only ~2 carousels, and the schedule that used to finish
 * the rest (GitHub Actions) runs hours late — so a run that still has matches
 * pending hands over to another right away.
 *
 * The same stop rules as the workflow's retry loop, for the same reasons:
 * nothing left, nothing published this time (retrying a failure that never
 * publishes only risks duplicates), or Meta blocking the account.
 */
export function shouldChain(summary: PostingSummary, depth: number): boolean {
  if (depth >= MAX_CHAIN_DEPTH) return false;
  if (summary.blocked) return false;
  if (summary.pending === 0) return false;
  return summary.published > 0;
}
