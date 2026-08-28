import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCompetitionPage } from "../src/sources/onefootball/client.js";

const bundesligaHtml = readFileSync(new URL("./fixtures/onefootball-bundesliga.html", import.meta.url), "utf-8");

describe("parseCompetitionPage", () => {
  it("parses real match cards across every round on the page, not just the first", () => {
    const cards = parseCompetitionPage(bundesligaHtml);
    expect(cards.length).toBeGreaterThan(30); // real fixture has 4 rounds x 9 matches
    const rounds = new Set(cards.map((c) => c.round));
    expect(rounds).toEqual(new Set([1, 2, 3, 4]));
  });

  it("parses a real match's team names, crest, and kickoff instant", () => {
    const cards = parseCompetitionPage(bundesligaHtml);
    const bayern = cards.find((c) => c.card.homeTeam.name === "Bayern de Munique");
    expect(bayern).toBeDefined();
    expect(bayern?.card.awayTeam.name).toBe("VfB Stuttgart");
    expect(bayern?.card.kickoff).toBe("2026-08-28T18:30:00Z");
    expect(bayern?.card.homeTeam.imageObject.path).toContain("onefootball.com");
    expect(bayern?.round).toBe(1);
  });

  it("returns an empty list when there's no __NEXT_DATA__ script at all", () => {
    expect(parseCompetitionPage("<html><body>nothing here</body></html>")).toEqual([]);
  });

  it("returns an empty list when the script tag has unparseable json", () => {
    expect(parseCompetitionPage('<script id="__NEXT_DATA__" type="application/json">not json</script>')).toEqual([]);
  });
});
