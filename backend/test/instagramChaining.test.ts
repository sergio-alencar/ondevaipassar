import { describe, expect, it } from "vitest";
import { MAX_CHAIN_DEPTH, shouldChain } from "../src/instagram/chaining.js";
import type { PostingSummary } from "../src/instagram/poster.js";

const summary = (over: Partial<PostingSummary>): PostingSummary =>
  ({ attempted: 2, published: 2, matchesPublished: 5, failed: 0, unknown: 0, skipped: 3, pending: 10, blocked: false, ...over }) as PostingSummary;

describe("shouldChain", () => {
  it("hands over while matches are pending and the run made progress", () => {
    expect(shouldChain(summary({}), 0)).toBe(true);
  });
  it("stops when nothing is left", () => expect(shouldChain(summary({ pending: 0 }), 0)).toBe(false));
  it("stops when this run published nothing (a failure that never publishes)", () => expect(shouldChain(summary({ published: 0 }), 0)).toBe(false));
  it("stops when Meta blocked the account", () => expect(shouldChain(summary({ blocked: true }), 0)).toBe(false));
  it("stops at the depth limit", () => expect(shouldChain(summary({}), MAX_CHAIN_DEPTH)).toBe(false));
});
