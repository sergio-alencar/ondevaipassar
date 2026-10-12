import { describe, expect, it } from "vitest";
import { findStaleOwnedBroadcasts } from "../src/ingest/staleOwnedBroadcasts.js";

const NOW = Date.parse("2026-10-12T12:00:00Z");
const FAR = "2026-10-15T20:00:00.000Z";
const kickoffs = new Map([
  ["m1", FAR],
  ["soon", "2026-10-12T13:00:00.000Z"],
  ["past", "2026-10-11T20:00:00.000Z"],
]);
const row = (matchId: string, channelId: string, sourceId = "futnatv") => ({ id: `${matchId}__${channelId}`, matchId, channelId, sourceId });

describe("findStaleOwnedBroadcasts", () => {
  it("removes a channel this source wrote but no longer names", () => {
    const stale = findStaleOwnedBroadcasts("futnatv", [{ matchId: "m1", channelId: "sportv" }], [row("m1", "globo"), row("m1", "sportv")], kickoffs, NOW);
    expect(stale).toEqual(["m1__globo"]);
  });

  it("never touches another source's row on the same match", () => {
    expect(findStaleOwnedBroadcasts("futnatv", [{ matchId: "m1", channelId: "sportv" }], [row("m1", "globo", "ge-globo")], kickoffs, NOW)).toEqual([]);
  });

  it("leaves a match the source did not resolve this run alone", () => {
    expect(findStaleOwnedBroadcasts("futnatv", [{ matchId: "m1", channelId: "sportv" }], [row("other", "globo")], new Map([["other", FAR]]), NOW)).toEqual([]);
  });

  it("leaves matches inside the safety buffer, and past ones, alone", () => {
    const claims = [{ matchId: "soon", channelId: "sportv" }, { matchId: "past", channelId: "sportv" }];
    expect(findStaleOwnedBroadcasts("futnatv", claims, [row("soon", "globo"), row("past", "globo")], kickoffs, NOW)).toEqual([]);
  });

  it("keeps everything still claimed", () => {
    expect(findStaleOwnedBroadcasts("futnatv", [{ matchId: "m1", channelId: "globo" }], [row("m1", "globo")], kickoffs, NOW)).toEqual([]);
  });
});
