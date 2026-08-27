import type { MatchView } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { buildCaption } from "../src/instagram/caption.js";

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
    broadcasts: [
      { channelId: "globo", displayName: "Globo", url: "https://globo.com", logoUrl: "", regionalCaveat: true, instagramHandle: "tvglobo" },
      {
        channelId: "premiere",
        displayName: "Premiere",
        url: "https://premiere.globo.com",
        logoUrl: "",
        regionalCaveat: false,
        instagramHandle: "premiere",
      },
    ],
    ...overrides,
  };
}

describe("buildCaption", () => {
  it("repeats team names, competition, BRT date/time, channels, and their handles as text", () => {
    const caption = buildCaption(buildMatch());
    expect(caption).toBe(
      [
        "Cruzeiro x Atlético-MG",
        "Campeonato Brasileiro Série A",
        "terça, 25/ago, 16h",
        "Transmissão: Globo, Premiere",
        "@tvglobo @premiere",
      ].join("\n"),
    );
  });

  it("joins a single broadcast with no separator noise", () => {
    const caption = buildCaption(
      buildMatch({
        broadcasts: [{ channelId: "cazetv", displayName: "CazéTV", url: "https://youtube.com", logoUrl: "", regionalCaveat: false }],
      }),
    );
    expect(caption).toContain("Transmissão: CazéTV");
  });

  it("shows 'horário a confirmar' instead of a fake time when the broadcaster hasn't confirmed one", () => {
    const caption = buildCaption(buildMatch({ kickoffTimeConfirmed: false }));
    expect(caption).toContain("terça, 25/ago, horário a confirmar");
  });

  it("formats a non-zero minute as HhMM, with no leading zero on the hour", () => {
    // 2026-08-25T22:30:00Z = 19:30 BRT.
    const caption = buildCaption(buildMatch({ kickoffUtc: "2026-08-25T22:30:00.000Z" }));
    expect(caption).toContain("terça, 25/ago, 19h30");
  });

  it("omits the handles line entirely when no broadcast has a verified handle yet", () => {
    const caption = buildCaption(
      buildMatch({
        broadcasts: [{ channelId: "getv", displayName: "ge TV", url: "https://youtube.com", logoUrl: "", regionalCaveat: false }],
      }),
    );
    expect(caption.endsWith("Transmissão: ge TV")).toBe(true);
  });

  it("only tags channels that actually have a verified handle, skipping the rest", () => {
    const caption = buildCaption(
      buildMatch({
        broadcasts: [
          { channelId: "globo", displayName: "Globo", url: "", logoUrl: "", regionalCaveat: false, instagramHandle: "tvglobo" },
          { channelId: "getv", displayName: "ge TV", url: "", logoUrl: "", regionalCaveat: false },
        ],
      }),
    );
    expect(caption.split("\n").at(-1)).toBe("@tvglobo");
  });
});
