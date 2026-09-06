import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCompetitionPage, parseTeamPage } from "../src/sources/onefootball/client.js";

const bundesligaHtml = readFileSync(new URL("./fixtures/onefootball-bundesliga.html", import.meta.url), "utf-8");
const bayernHtml = readFileSync(new URL("./fixtures/onefootball-time-bayern.html", import.meta.url), "utf-8");

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

  it("captures ottStreamType per card, genuinely mixed rather than uniform (real fixture: 26 cards at 2, 9 at 0, 1 at 1)", () => {
    const cards = parseCompetitionPage(bundesligaHtml);
    const values = new Set(cards.map((c) => c.card.ottStreamType));
    expect(values).toEqual(new Set([0, 1, 2]));
    const bayern = cards.find((c) => c.card.homeTeam.name === "Bayern de Munique");
    expect(bayern?.card.ottStreamType).toBe(1); // confirms a card can be something other than 0/2
  });

  it("returns an empty list when there's no __NEXT_DATA__ script at all", () => {
    expect(parseCompetitionPage("<html><body>nothing here</body></html>")).toEqual([]);
  });

  it("returns an empty list when the script tag has unparseable json", () => {
    expect(parseCompetitionPage('<script id="__NEXT_DATA__" type="application/json">not json</script>')).toEqual([]);
  });
});

describe("parseTeamPage", () => {
  it("returns a club's fixtures across every competition, which is what competition pages can't do", () => {
    const comps = new Set(parseTeamPage(bayernHtml).map((c) => c.card.competitionName));
    expect(comps).toContain("Bundesliga");
    expect(comps).toContain("UEFA Liga dos Campeões");
    expect(comps).toContain("DFB-Pokal");
  });

  // A team page groups by MONTH ("setembro 2026"), not by round. Reading a
  // round out of that header pulls the year: every match would be recorded
  // as round 2026.
  it("never reads a round number out of a team page's month headers", () => {
    for (const { round } of parseTeamPage(bayernHtml)) expect(round).toBeNull();
  });

  it("still reads rounds on a competition page, where the header really is one", () => {
    expect(new Set(parseCompetitionPage(bundesligaHtml).map((c) => c.round))).toEqual(new Set([1, 2, 3, 4]));
  });
});
