import { describe, expect, it } from "vitest";
import { mapWithConcurrency, mapWithinBudget, TIMED_OUT } from "../src/lib/concurrency.js";

describe("mapWithConcurrency", () => {
  it("returns results in the input's order, however long each task takes", async () => {
    const delays = [30, 5, 20, 1];
    const result = await mapWithConcurrency(delays, 4, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms * 2;
    });
    expect(result).toEqual([60, 10, 40, 2]);
  });

  it("never has more than `limit` tasks in flight", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 12 }, (_, i) => i), 4, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
    });
    expect(peak).toBe(4);
  });

  it("handles fewer items than the limit, and an empty list", async () => {
    expect(await mapWithConcurrency([1, 2], 10, async (n) => n + 1)).toEqual([2, 3]);
    expect(await mapWithConcurrency([], 4, async (n: number) => n)).toEqual([]);
  });
});

describe("mapWithinBudget", () => {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it("returns everything in order when it all fits", async () => {
    const result = await mapWithinBudget([3, 1, 2], 3, 500, async (n) => {
      await sleep(5);
      return n * 10;
    });
    expect(result).toEqual([30, 10, 20]);
  });

  // The incident: a slow upstream let the slowest page decide how much of the
  // 60s ingest was left. A page that's still running at the deadline stops
  // being waited for.
  it("stops waiting for an item still running at the deadline, and keeps the ones that finished", async () => {
    const result = await mapWithinBudget([1, 2], 2, 40, async (n) => {
      await sleep(n === 1 ? 5 : 400);
      return n;
    });
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(TIMED_OUT);
  });

  it("never starts an item once the deadline has passed", async () => {
    const started: number[] = [];
    // limit 1 forces a queue: by the time item 2 would start, the budget is spent
    const result = await mapWithinBudget([1, 2, 3], 1, 30, async (n) => {
      started.push(n);
      await sleep(40);
      return n;
    });
    expect(started).toEqual([1]);
    expect(result).toEqual([TIMED_OUT, TIMED_OUT, TIMED_OUT]);
  });

  it("lets a task's own error through, which is not a timeout", async () => {
    await expect(
      mapWithinBudget([1], 1, 500, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
