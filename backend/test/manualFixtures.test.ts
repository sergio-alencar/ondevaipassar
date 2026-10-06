import { findChannelById, findTeamById } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { isTrackedBrazilianFemininoTeam } from "../src/ingest/femininoTeamResolver.js";
import { expandManualFixtures, MANUAL_FIXTURES } from "../src/ingest/manualFixtures.js";

const NOW = "2026-10-06T12:00:00.000Z";
const { matchRows, broadcastRows } = expandManualFixtures(MANUAL_FIXTURES, NOW);

describe("the hand-seeded fixtures", () => {
  it("has the nine games with a club this site follows, not the whole 24-game group stage", () => {
    expect(matchRows).toHaveLength(9);
  });

  // Colombia's champion (Deportivo Cali) goes to Group D, the runner-up (Santa
  // Fe) to Corinthians' Group A — so Corinthians' 21/out opponent is Santa Fe.
  it("has Corinthians playing Santa Fé, the runner-up, on 21/out", () => {
    const game = matchRows.find((row) => row.awayTeamId === "corinthians_feminino" && row.homeTeamId === "santa_fe_feminino");
    expect(game?.kickoffUtc).toBe("2026-10-21T20:00:00.000Z");
  });

  it("gives every game a unique id, so a re-run can never insert a game twice", () => {
    expect(new Set(matchRows.map((row) => row.id)).size).toBe(matchRows.length);
  });

  // The rule that keeps this from becoming a list of every women's fixture:
  // each game has to involve a club we follow.
  it("only holds games with a tracked Brazilian club in them", () => {
    for (const row of matchRows) {
      expect(isTrackedBrazilianFemininoTeam(row.homeTeamId ?? null) || isTrackedBrazilianFemininoTeam(row.awayTeamId ?? null)).toBe(true);
    }
  });

  it("only references teams and channels that exist in the registry", () => {
    for (const row of matchRows) {
      expect(findTeamById(row.homeTeamId as string)).toBeDefined();
      expect(findTeamById(row.awayTeamId as string)).toBeDefined();
    }
    for (const row of broadcastRows) expect(findChannelById(row.channelId)).toBeDefined();
  });

  // Every source states the times as Brasília ("17h (de Brasília)"); stored as
  // UTC, 17h and 21h BRT are 20:00 and 00:00 the next day.
  it("stores Brasília kickoffs as UTC", () => {
    const opener = matchRows.find((row) => row.homeTeamId === "corinthians_feminino" && row.awayTeamId === "colo_colo_feminino");
    expect(opener?.kickoffUtc).toBe("2026-10-15T20:00:00.000Z");
    const night = matchRows.find((row) => row.awayTeamId === "palmeiras_feminino" && row.homeTeamId === "universitario_feminino");
    expect(night?.kickoffUtc).toBe("2026-10-16T00:00:00.000Z");
  });

  // Lance: the club's channel airs "todos os jogos do Verdão" — and nobody
  // else's. Putting TV Palmeiras on a Corinthians game would send a viewer to
  // a channel that isn't showing it.
  it("puts TV Palmeiras on Palmeiras' games and no one else's", () => {
    for (const row of matchRows) {
      const channels = broadcastRows.filter((b) => b.matchId === row.id).map((b) => b.channelId);
      const palmeirasPlays = row.homeTeamId === "palmeiras_feminino" || row.awayTeamId === "palmeiras_feminino";
      expect(channels.includes("tvpalmeiras")).toBe(palmeirasPlays);
    }
  });

  // Sourced per game, never inferred from who holds the rights: a 2023 Terra
  // piece names Globo, Band and Paramount without naming a single game.
  it("does not attach channels that merely hold rights to the competition", () => {
    const used = new Set(broadcastRows.map((b) => b.channelId));
    for (const unsourced of ["globo", "band", "bandsports", "sportv", "paramountplus"]) expect(used.has(unsourced)).toBe(false);
  });

  it("marks every row as manual, which is what lets the live source take over", () => {
    for (const row of matchRows) expect(row.sourceId).toBe("manual-fixtures");
  });
});
