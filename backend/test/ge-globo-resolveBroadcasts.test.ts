import { describe, expect, it } from "vitest";
import { resolveBroadcasts } from "../src/sources/ge-globo/adapter.js";

function source(name: string) {
  return { name, url: `https://example.com/${name}`, officialLogoUrl: `https://example.com/${name}.png` };
}

describe("resolveBroadcasts", () => {
  it("drops globoplay when a real channel is also present — the actual Internacional x Atlético-MG bug", () => {
    const result = resolveBroadcasts([source("sportv"), source("Premiere"), source("globoplay"), source("Cartola")]);
    expect(result.map((b) => b.channelId).sort()).toEqual(["premiere", "sportv"]);
  });

  it("keeps globoplay if it's ever the only real channel present", () => {
    const result = resolveBroadcasts([source("globoplay"), source("Cartola")]);
    expect(result.map((b) => b.channelId)).toEqual(["globoplay"]);
  });

  it("filters out unrecognized entries (e.g. Cartola) without needing a globoplay dedupe", () => {
    const result = resolveBroadcasts([source("Premiere"), source("Cartola")]);
    expect(result.map((b) => b.channelId)).toEqual(["premiere"]);
  });

  it("returns an empty list for null liveWatchSources", () => {
    expect(resolveBroadcasts(null)).toEqual([]);
  });
});
