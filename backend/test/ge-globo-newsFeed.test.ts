import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractNewsFeedItems } from "../src/sources/ge-globo/newsFeedClient.js";

const fixtureHtml = readFileSync(
  new URL("./fixtures/ge-globo-news-feed-goias.html", import.meta.url),
  "utf-8",
);

describe("extractNewsFeedItems", () => {
  it("extracts the embedded news-feed items from a real saved team page", () => {
    const items = extractNewsFeedItems(fixtureHtml);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(typeof item.content.url).toBe("string");
      expect(typeof item.content.title).toBe("string");
    }
  });

  it("includes a known 'onde assistir' preview article for this team", () => {
    const items = extractNewsFeedItems(fixtureHtml);
    const titles = items.map((item) => item.content.title);
    expect(titles).toContain("Cuiabá x Goiás: onde assistir ao vivo, horário e escalações");
  });

  it("throws a clear error when the marker is missing (page structure changed)", () => {
    expect(() => extractNewsFeedItems("<html><body>no data here</body></html>")).toThrow(/not found/);
  });
});
