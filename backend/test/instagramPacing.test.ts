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

import { isMediaNotFound } from "../src/instagram/graphApiClient.js";

describe("isMediaNotFound", () => {
  it("recognises Instagram's 'Media Not Found' answer at publish time", () => {
    const error = new Error('Instagram Graph API error (HTTP 400): {"error":{"message":"The requested resource does not exist","code":24,"error_subcode":2207006,"error_user_title":"Media Not Found"}}');
    expect(isMediaNotFound(error)).toBe(true);
  });
  it("is false for any other failure, which may well have published", () => {
    expect(isMediaNotFound(new Error('Instagram Graph API error (HTTP 500): {"error":{"code":2}}'))).toBe(false);
    expect(isMediaNotFound("not an error")).toBe(false);
  });
});
