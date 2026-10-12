import { describe, expect, it } from "vitest";
import { canSkipYoutubeRun, MIN_HOURS_BETWEEN_YOUTUBE_RUNS } from "../src/ingest/youtubeEnrichment.js";

const NOW = new Date("2026-10-12T15:00:00.000Z");
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

describe("canSkipYoutubeRun", () => {
  // The day it was written: six ingests forced while testing used up the daily quota and every channel then failed with 429.
  it("skips a channel that ran fine a few hours ago, whoever asks again", () => {
    expect(canSkipYoutubeRun({ status: "ok", startedAt: hoursAgo(1), errorMessage: null }, NOW)).toBe(true);
    expect(canSkipYoutubeRun({ status: "partial", startedAt: hoursAgo(5), errorMessage: null }, NOW)).toBe(true);
  });

  it("asks again once the last good run is old enough", () => {
    expect(canSkipYoutubeRun({ status: "ok", startedAt: hoursAgo(MIN_HOURS_BETWEEN_YOUTUBE_RUNS + 0.1), errorMessage: null }, NOW)).toBe(false);
    expect(canSkipYoutubeRun({ status: "ok", startedAt: hoursAgo(24), errorMessage: null }, NOW)).toBe(false);
  });

  it("asks when the channel has never run", () => {
    expect(canSkipYoutubeRun(undefined, NOW)).toBe(false);
  });

  it("does not retry right after the quota ran out, since nothing can succeed before it resets", () => {
    const quota = "YouTube Data API error (HTTP 429) on search: Quota exceeded for quota metric 'Search Queries'";
    expect(canSkipYoutubeRun({ status: "failed", startedAt: hoursAgo(1), errorMessage: quota }, NOW)).toBe(true);
    expect(canSkipYoutubeRun({ status: "failed", startedAt: hoursAgo(8), errorMessage: quota }, NOW)).toBe(false);
  });

  it("retries a failure that was not the quota", () => {
    expect(canSkipYoutubeRun({ status: "failed", startedAt: hoursAgo(1), errorMessage: "network timeout" }, NOW)).toBe(false);
  });
});
