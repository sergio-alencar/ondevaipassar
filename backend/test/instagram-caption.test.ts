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
      { channelId: "globo", displayName: "Globo", url: "https://globo.com", logoUrl: "", regionalCaveat: true },
      { channelId: "premiere", displayName: "Premiere", url: "https://premiere.globo.com", logoUrl: "", regionalCaveat: false },
    ],
    ...overrides,
  };
}

describe("buildCaption", () => {
  it("repeats team names, competition, BRT date/time, and channels as text", () => {
    const caption = buildCaption(buildMatch());
    expect(caption).toBe(
      ["Cruzeiro x Atlético-MG", "Campeonato Brasileiro Série A", "25 de agosto, 16:00", "Transmissão: Globo, Premiere"].join(
        "\n",
      ),
    );
  });

  it("joins a single broadcast with no separator noise", () => {
    const caption = buildCaption(
      buildMatch({ broadcasts: [{ channelId: "cazetv", displayName: "CazéTV", url: "https://youtube.com", logoUrl: "", regionalCaveat: false }] }),
    );
    expect(caption).toContain("Transmissão: CazéTV");
  });

  it("shows 'horário a confirmar' instead of a fake time when the broadcaster hasn't confirmed one", () => {
    const caption = buildCaption(buildMatch({ kickoffTimeConfirmed: false }));
    expect(caption).toContain("25 de agosto, horário a confirmar");
  });
});
