import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSchedule } from "../src/sources/meuguia/schedule.js";

const espnHtml = readFileSync(new URL("./fixtures/meuguia-espn.html", import.meta.url), "utf-8");

// The fixture's own grid starts at "sexta-feira, 28/8" — this is the date
// it was actually fetched on, needed here only to seed the year (the day
// headers themselves never say one).
const FIXED_NOW = new Date("2026-08-28T12:00:00Z");

describe("parseSchedule", () => {
  it("parses a real live match, converting its BRT time to UTC", () => {
    const entries = parseSchedule(espnHtml, FIXED_NOW);
    const match = entries.find((e) => e.homeTeamNameRaw === "Aston Villa");
    expect(match).toEqual({
      homeTeamNameRaw: "Aston Villa",
      awayTeamNameRaw: "Arsenal",
      // segunda-feira, 31/8, 15:50 BRT -> 18:50 UTC (a 10min pre-game lead-in
      // ahead of the 16:00 BRT kickoff ge.globo's own agenda gives for this
      // match — same "broadcaster starts before real kickoff" pattern
      // broadcastMatching.ts's date tolerance already exists to absorb).
      startTimeUtc: "2026-08-31T18:50:00.000Z",
    });
  });

  it("strips a leading competition-name prefix from the title instead of treating it as part of the home team's name", () => {
    const entries = parseSchedule(espnHtml, FIXED_NOW);
    const match = entries.find((e) => e.awayTeamNameRaw === "Cuiabá");
    // Real title: "Campeonato Brasileiro Série B: Botafogo-SP x Cuiabá - Ao Vivo"
    expect(match?.homeTeamNameRaw).toBe("Botafogo-SP");
  });

  it("excludes a recorded highlights rerun (titled 'VT - ...', no 'Ao Vivo' suffix)", () => {
    const entries = parseSchedule(espnHtml, FIXED_NOW);
    expect(entries.some((e) => e.homeTeamNameRaw.startsWith("VT"))).toBe(false);
  });

  it("only includes entries under the Esporte/Futebol category", () => {
    // Real fixture has plenty of non-football rows (Sportscenter, F Show,
    // Mundo F, ...) mixed into the same list — every parsed entry's raw
    // title should itself look like a match, not a talk-show name.
    const entries = parseSchedule(espnHtml, FIXED_NOW);
    for (const entry of entries) {
      expect(entry.homeTeamNameRaw).not.toMatch(/sportscenter|f show|mundo f|equipe f/i);
    }
  });

  it("advances the day as it walks past each subheader", () => {
    const entries = parseSchedule(espnHtml, FIXED_NOW);
    const days = entries.map((e) => e.startTimeUtc.slice(0, 10));
    const sorted = [...days].sort();
    expect(days).toEqual(sorted);
  });

  it("returns an empty list for html with no football entries", () => {
    expect(parseSchedule("<html><body>nothing here</body></html>", FIXED_NOW)).toEqual([]);
  });
});
