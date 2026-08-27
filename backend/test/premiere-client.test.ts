import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractApolloState } from "../src/sources/premiere/client.js";
import { extractPremiereMatches } from "../src/sources/premiere/schema.js";

const fixturePath = fileURLToPath(new URL("./fixtures/premiere-canal.html", import.meta.url));
const fixtureHtml = readFileSync(fixturePath, "utf-8");

describe("extractApolloState", () => {
  it("extracts the embedded Apollo cache from a real saved Globoplay page", () => {
    const apolloState = extractApolloState(fixtureHtml);
    expect(Object.keys(apolloState).length).toBeGreaterThan(0);
  });

  it("throws a clear error when the marker is missing (page structure changed)", () => {
    expect(() => extractApolloState("<html><body>no data here</body></html>")).toThrow(/apolloState.*not found/);
  });
});

describe("extractPremiereMatches", () => {
  it("resolves real SoccerMatch entries against their SportsTeam refs in the same fixture", () => {
    const apolloState = extractApolloState(fixtureHtml);
    const streams = extractPremiereMatches(apolloState);
    expect(streams.length).toBeGreaterThan(0);
    for (const stream of streams) {
      expect(stream.homeTeamNameRaw.length).toBeGreaterThan(0);
      expect(stream.awayTeamNameRaw.length).toBeGreaterThan(0);
      expect(new Date(stream.startTimeUtc).getFullYear()).toBeGreaterThan(2000);
    }
  });
});
