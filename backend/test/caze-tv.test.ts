import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractYtInitialData, findAllByKey } from "../src/sources/caze-tv/client.js";
import {
  parseAvatarUrl,
  parseLockupViewModel,
  parseMatchTitle,
  parseScheduledDate,
} from "../src/sources/caze-tv/schema.js";

const fixturePath = new URL("./fixtures/caze-tv-streams.html", import.meta.url);
const fixtureHtml = readFileSync(fixturePath, "utf-8");

describe("extractYtInitialData", () => {
  it("extracts the embedded ytInitialData JSON from a real saved CazéTV streams page", () => {
    const data = extractYtInitialData(fixtureHtml);
    expect(typeof data).toBe("object");
    expect(data).not.toBeNull();
  });

  it("throws a clear error when the marker is missing (page structure changed)", () => {
    expect(() => extractYtInitialData("<html><body>no data here</body></html>")).toThrow(
      /var ytInitialData.*not found/,
    );
  });

  it("contains real lockupViewModel entries, each parsing into the expected shape", () => {
    const data = extractYtInitialData(fixtureHtml);
    const rawLockups = findAllByKey(data, "lockupViewModel");
    expect(rawLockups.length).toBeGreaterThan(0);

    const parsed = rawLockups.map(parseLockupViewModel);
    const validCount = parsed.filter((lockup) => lockup !== null).length;
    // Every grid item on this saved fixture is a real video tile with the
    // expected shape — a parse failure here would mean YouTube's page
    // structure changed, not that some items are legitimately different.
    expect(validCount).toBe(rawLockups.length);
  });

  it("finds a real channel avatar image", () => {
    const data = extractYtInitialData(fixtureHtml);
    const avatarUrl = findAllByKey(data, "avatarViewModel").map(parseAvatarUrl).find((url) => url !== null);
    expect(avatarUrl).toMatch(/^https:\/\//);
  });
});

describe("parseMatchTitle", () => {
  it("extracts home/away team names from a real match stream title", () => {
    expect(parseMatchTitle("AO VIVO: BOTAFOGO X PALMEIRAS | BRASILEIRÃO 2026 | 26ª RODADA")).toEqual({
      homeTeamNameRaw: "BOTAFOGO",
      awayTeamNameRaw: "PALMEIRAS",
    });
  });

  it("returns null for a non-match stream (interview, highlights, etc.) instead of guessing", () => {
    expect(parseMatchTitle("AO VIVO: BASTIDORES DO CASIMIRO")).toBeNull();
    expect(parseMatchTitle("MELHORES MOMENTOS: FLAMENGO X VASCO")).toBeNull();
  });
});

describe("parseScheduledDate", () => {
  it("extracts day/month/year from a real 'Programado para' metadata row", () => {
    expect(parseScheduledDate(["4 esperando", "Programado para 06/09/2026, 13:30"])).toEqual({
      day: 6,
      month: 9,
      year: 2026,
    });
  });

  it("returns null when no row matches (stream already live or ended)", () => {
    expect(parseScheduledDate(["12 mil visualizações", "há 2 horas"])).toBeNull();
  });
});
