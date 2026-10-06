import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "../src/lib/concurrency.js";

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
