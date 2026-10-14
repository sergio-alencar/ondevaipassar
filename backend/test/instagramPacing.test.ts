import { describe, expect, it } from "vitest";
import { MAX_CAROUSELS_PER_DAY, MIN_GAP_BETWEEN_POSTS_MS, pacingBlock } from "../src/instagram/pacing.js";

const NOW = Date.parse("2026-10-14T13:00:00Z");
const at = (minutesAgo: number, media: string) => ({ igMediaId: media, postedAt: new Date(NOW - minutesAgo * 60_000).toISOString() });

describe("pacingBlock", () => {
  it("allows the first post of the day", () => expect(pacingBlock([], NOW)).toBeNull());

  it("waits when the last post was too recent", () => {
    expect(pacingBlock([at(5, "a")], NOW)).toBe("too-soon");
    expect(pacingBlock([at(MIN_GAP_BETWEEN_POSTS_MS / 60_000 + 1, "a")], NOW)).toBeNull();
  });

  it("counts a carousel once even though it has one row per match", () => {
    const rows = [at(60, "a"), at(60, "a"), at(60, "a")];
    expect(pacingBlock(rows, NOW)).toBeNull();
  });

  it("stops at the daily cap", () => {
    const rows = Array.from({ length: MAX_CAROUSELS_PER_DAY }, (_, i) => at(60 + i * 30, `m${i}`));
    expect(pacingBlock(rows, NOW)).toBe("daily-cap");
    expect(pacingBlock(rows.slice(1), NOW)).toBeNull();
  });
});
