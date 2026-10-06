import { describe, expect, it } from "vitest";
import { runStagesWithinBudget, type IngestStage } from "../src/ingest/budget.js";

/** A clock the stages advance themselves, so the test never waits. */
function fakeClock() {
  let time = 0;
  return { now: () => time, advance: (ms: number) => void (time += ms) };
}

function stage(clock: ReturnType<typeof fakeClock>, name: string, takes: number, log: string[], needsMs?: number): IngestStage {
  return {
    name,
    needsMs,
    run: async () => {
      log.push(name);
      clock.advance(takes);
    },
  };
}

describe("runStagesWithinBudget", () => {
  it("runs everything, in order, when there is time", async () => {
    const clock = fakeClock();
    const log: string[] = [];
    const result = await runStagesWithinBudget(
      [stage(clock, "a", 1000, log, 2000), stage(clock, "b", 1000, log, 2000), stage(clock, "c", 1000, log)],
      0, 54_000, clock.now,
    );
    expect(log).toEqual(["a", "b", "c"]);
    expect(result).toEqual({ ran: ["a", "b", "c"], skipped: [] });
  });

  // The real incident: OneFootball took ~30s instead of ~11s, and the chain
  // crossed Vercel's 60s line mid-step.
  it("skips a step that would not finish inside the budget, instead of starting it and being killed", async () => {
    const clock = fakeClock();
    const log: string[] = [];
    const result = await runStagesWithinBudget(
      [
        stage(clock, "slow-essential", 50_000, log), // no needsMs: must run
        stage(clock, "late-enrichment", 5_000, log, 14_000),
      ],
      0, 54_000, clock.now,
    );
    expect(log).toEqual(["slow-essential"]);
    expect(result.skipped).toEqual(["late-enrichment"]);
  });

  // The ones that create matches (and the instant mirroring step) carry no
  // estimate on purpose: a day's fixtures missing is worse than a late
  // enrichment, so they run even with the budget already spent.
  it("never skips a step with no estimate, even past the budget", async () => {
    const clock = fakeClock();
    const log: string[] = [];
    const result = await runStagesWithinBudget(
      [stage(clock, "creates-matches", 70_000, log), stage(clock, "mirroring", 100, log)],
      0, 54_000, clock.now,
    );
    expect(result.skipped).toEqual([]);
    expect(log).toEqual(["creates-matches", "mirroring"]);
  });

  it("measures from when the ingest started, not from zero", async () => {
    const clock = fakeClock();
    clock.advance(100_000); // the process has been alive a while; only the ingest's own time counts
    const log: string[] = [];
    const result = await runStagesWithinBudget([stage(clock, "a", 1000, log, 10_000)], clock.now(), 54_000, clock.now);
    expect(result.ran).toEqual(["a"]);
  });

  // Order is the whole reason later steps can rely on earlier ones; skipping
  // may only drop, never reorder, and a cheap later step still gets its turn.
  it("keeps the order of what remains, and still runs a cheap step after a skipped expensive one", async () => {
    const clock = fakeClock();
    const log: string[] = [];
    const result = await runStagesWithinBudget(
      [
        stage(clock, "first", 41_000, log),
        stage(clock, "expensive", 10_000, log, 14_000), // 41s + 14s > 54s: skipped
        stage(clock, "cheap", 1_000, log, 3_000),       // 41s + 3s fits
      ],
      0, 54_000, clock.now,
    );
    expect(log).toEqual(["first", "cheap"]);
    expect(result.skipped).toEqual(["expensive"]);
  });

  it("starts a step that fits exactly, since the limit is a ceiling and not a margin", async () => {
    const clock = fakeClock();
    const log: string[] = [];
    clock.advance(40_000);
    const result = await runStagesWithinBudget([stage(clock, "exact", 14_000, log, 14_000)], 0, 54_000, clock.now);
    expect(result.ran).toEqual(["exact"]);
  });
});
