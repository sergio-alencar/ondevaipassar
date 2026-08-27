import type { MatchView } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { renderMatchImage } from "../src/instagram/renderImage.js";

function buildMatch(overrides: Partial<MatchView> = {}): MatchView {
  return {
    id: "match-1",
    competitionId: "brasileirao-a",
    competitionName: "Campeonato Brasileiro Série A",
    homeTeamId: "cruzeiro",
    homeTeamName: "Cruzeiro",
    homeTeamCrestUrl: "https://example.com/cruzeiro.png",
    awayTeamId: "atletico_mineiro",
    awayTeamName: "Atlético-MG",
    awayTeamCrestUrl: "https://example.com/atletico.png",
    kickoffUtc: "2026-08-25T19:00:00.000Z",
    kickoffTimeConfirmed: true,
    round: 20,
    status: "scheduled",
    broadcasts: [{ channelId: "globo", displayName: "Globo", url: "https://globo.com", logoUrl: "", regionalCaveat: true }],
    ...overrides,
  };
}

function isPng(buffer: Buffer): boolean {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return buffer.subarray(0, 8).equals(PNG_SIGNATURE);
}

describe("renderMatchImage", () => {
  it("renders a valid, non-empty PNG for a match with local crest art on both sides", async () => {
    const png = await renderMatchImage(buildMatch());
    expect(isPng(png)).toBe(true);
    expect(png.length).toBeGreaterThan(1000);
  });

  it("falls back to the generic shield for a team with no local crest art", async () => {
    const png = await renderMatchImage(buildMatch({ homeTeamId: "a-team-with-no-local-art" }));
    expect(isPng(png)).toBe(true);
  });

  it("falls back to the generic shield for an untracked opponent (null team id)", async () => {
    const png = await renderMatchImage(buildMatch({ awayTeamId: null, awayTeamName: "Visitante" }));
    expect(isPng(png)).toBe(true);
  });

  it("handles many broadcasts wrapping to multiple rows", async () => {
    const png = await renderMatchImage(
      buildMatch({
        broadcasts: [
          { channelId: "globo", displayName: "Globo", url: "", logoUrl: "", regionalCaveat: true },
          { channelId: "premiere", displayName: "Premiere", url: "", logoUrl: "", regionalCaveat: false },
          { channelId: "getv", displayName: "ge TV", url: "", logoUrl: "", regionalCaveat: false },
          { channelId: "sportv", displayName: "SporTV", url: "", logoUrl: "", regionalCaveat: false },
          { channelId: "tntsports", displayName: "TNT Sports", url: "", logoUrl: "", regionalCaveat: false },
        ],
      }),
    );
    expect(isPng(png)).toBe(true);
  });

  it("handles a long team name without throwing", async () => {
    const png = await renderMatchImage(buildMatch({ awayTeamName: "Grêmio Foot-Ball Porto Alegrense" }));
    expect(isPng(png)).toBe(true);
  });
});
