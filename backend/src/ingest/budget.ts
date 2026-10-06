/**
 * Vercel kills a function the instant it passes its maxDuration (60s, see
 * vercel.json) — no exception to catch, no response, just a 504 and whatever
 * step was in flight cut off. The ingest is a long chain of steps and it has
 * been creeping toward that line: 40.9s on the scheduled run, 47.7s on a
 * forced one, and then a forced run that crossed it (OneFootball alone took
 * ~30s instead of ~11s that day, which no code here controls).
 *
 * So the chain runs under a budget instead of a hope. Before each step, if it
 * might not finish inside the budget, it is skipped and named in the result —
 * a clean partial run that /api/status reports (a source that didn't run
 * today shows up as stale) instead of a kill at a random point.
 *
 * The same idea as the Instagram poster's TIME_BUDGET_MS, for the same
 * reason.
 */

/**
 * Stop starting steps past this. Vercel's ceiling is 60s; the rest is for a
 * step that runs longer than estimated, the response itself, and the time
 * between the platform starting the clock and this handler seeing the request.
 */
export const INGEST_BUDGET_MS = 54_000;

export interface IngestStage {
  name: string;
  run: () => Promise<void>;
  /**
   * Worst case this step needs, from observed runs — a ESTIMATE, rounded up.
   * A step is started only if elapsed + needsMs fits in the budget. Omit for
   * a step that must always run: the ones that create matches (a day's
   * fixtures missing is worse than a late enrichment) and the instant ones.
   */
  needsMs?: number;
}

export interface IngestResult {
  ran: string[];
  skipped: string[];
}

/**
 * Runs the stages in order, skipping any that wouldn't fit. Order is
 * preserved and never rearranged: later steps depend on earlier ones (see the
 * comments in the cron route), so skipping one can only ever drop the tail
 * of an enrichment, never reorder what remains.
 */
export async function runStagesWithinBudget(
  stages: IngestStage[],
  startedAt: number,
  budgetMs: number = INGEST_BUDGET_MS,
  now: () => number = Date.now,
): Promise<IngestResult> {
  const result: IngestResult = { ran: [], skipped: [] };
  for (const stage of stages) {
    const elapsed = now() - startedAt;
    if (stage.needsMs !== undefined && elapsed + stage.needsMs > budgetMs) {
      result.skipped.push(stage.name);
      console.warn(`[ingest] skipping ${stage.name}: ${elapsed}ms elapsed + ~${stage.needsMs}ms needed exceeds the ${budgetMs}ms budget`);
      continue;
    }
    await stage.run();
    result.ran.push(stage.name);
  }
  return result;
}
