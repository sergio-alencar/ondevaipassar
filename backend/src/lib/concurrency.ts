/** Runs `task` over every item with at most `limit` in flight, returning results in the input's order. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Marks an item `mapWithinBudget` never got an answer for in time. */
export const TIMED_OUT = Symbol("timed-out");

class TimeoutError extends Error {}

/** Rejects with TimeoutError if `promise` hasn't settled in `ms`. The work behind it is NOT cancelled — only the waiting stops. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError("timed out")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * mapWithConcurrency under one shared deadline: an item not STARTED by the
 * deadline is never started, and one still running when it passes stops being
 * waited for. Both come back as TIMED_OUT, in the input's position, so the
 * caller decides what a missing page means.
 *
 * Exists because a per-request timeout bounds one request, not a batch:
 * OneFootball's 30 pages at 15s and two retries each could take minutes in
 * the worst case, and on a bad day took 40s of a 60s function. Errors other
 * than the deadline propagate — the task is expected to handle its own.
 */
export async function mapWithinBudget<T, R>(
  items: T[],
  limit: number,
  budgetMs: number,
  task: (item: T) => Promise<R>,
): Promise<(R | typeof TIMED_OUT)[]> {
  const deadline = Date.now() + budgetMs;
  return mapWithConcurrency(items, limit, async (item): Promise<R | typeof TIMED_OUT> => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return TIMED_OUT;
    try {
      return await withTimeout(task(item), remaining);
    } catch (error) {
      if (error instanceof TimeoutError) return TIMED_OUT;
      throw error;
    }
  });
}
