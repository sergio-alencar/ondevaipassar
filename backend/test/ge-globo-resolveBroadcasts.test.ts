import { describe, expect, it } from "vitest";
import { resolveBroadcasts } from "../src/sources/ge-globo/adapter.js";

// cta defaults to "" (a genuinely confirmed source) — tests that care about
// the upsell case pass cta explicitly.
function source(name: string, cta = "") {
  return { name, url: `https://example.com/${name}`, officialLogoUrl: `https://example.com/${name}.png`, cta };
}

describe("resolveBroadcasts", () => {
  it("drops a subscription-upsell entry (non-empty cta) even when it's the only entry — the actual Náutico x Athletic bug: sportv/Premiere/globoplay all showed with cta:\"Assine\" for a match with no confirmed broadcast at all", () => {
    const result = resolveBroadcasts([source("sportv", "Assine"), source("Premiere", "Assine"), source("globoplay", "Assine")]);
    expect(result).toEqual([]);
  });

  it("keeps a genuinely confirmed entry (empty cta) even alongside unrelated upsell entries", () => {
    const result = resolveBroadcasts([source("Prime Vídeo", ""), source("globoplay", "Assine")]);
    expect(result.map((b) => b.channelId)).toEqual(["primevideo"]);
  });

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
