import type { MatchView } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { buildDigest } from "../src/digest/digest.js";

const NOW = new Date("2026-09-05T18:00:00.000Z"); // sábado, 5/set (15h BRT)

function buildMatch(overrides: Partial<MatchView> = {}): MatchView {
  return {
    id: "ge-globo:1",
    competitionId: "brasileirao-serie-a",
    competitionName: "Campeonato Brasileiro Série A",
    homeTeamId: "sao_paulo",
    homeTeamName: "São Paulo",
    homeTeamCrestUrl: "",
    awayTeamId: "atletico_mineiro",
    awayTeamName: "Atlético-MG",
    awayTeamCrestUrl: "",
    kickoffUtc: "2026-09-05T21:30:00.000Z", // 18h30 BRT
    kickoffTimeConfirmed: true,
    round: 26,
    status: "scheduled",
    broadcasts: [{ channelId: "premiere", displayName: "Premiere", kind: "tv" as const, free: false, url: "", logoUrl: "", regionalCaveat: false }],
    ...overrides,
  } as MatchView;
}

describe("buildDigest", () => {
  it("renders one match end to end, with no footnote when nothing needs one", () => {
    expect(buildDigest([buildMatch()], NOW)).toBe(
      [
        "⚽ *Onde assistir aos jogos de hoje — sábado, 5/set*",
        "",
        "*Campeonato Brasileiro Série A*",
        "18h30 *São Paulo x Atlético-MG* — Premiere",
        "",
        "Mais detalhes: https://ondevaipassar.com",
      ].join("\n"),
    );
  });

  it("groups by competition in order of first appearance, keeping each group chronological", () => {
    const digest = buildDigest(
      [
        buildMatch({ id: "a", kickoffUtc: "2026-09-05T19:00:00.000Z" }),
        buildMatch({
          id: "b",
          competitionId: "brasileirao-serie-b",
          competitionName: "Campeonato Brasileiro Série B",
          kickoffUtc: "2026-09-05T20:00:00.000Z",
        }),
        buildMatch({ id: "c", kickoffUtc: "2026-09-05T22:00:00.000Z" }),
      ],
      NOW,
    );

    expect(digest.indexOf("Série A")).toBeLessThan(digest.indexOf("Série B"));
    // The Série A group keeps both of its matches, in kickoff order.
    expect(digest.indexOf("16h *")).toBeLessThan(digest.indexOf("19h *"));
  });

  it("says 'Transmissão a confirmar' for a match with no broadcast, matching the site's own wording", () => {
    expect(buildDigest([buildMatch({ broadcasts: [] })], NOW)).toContain(
      "18h30 *São Paulo x Atlético-MG* — Transmissão a confirmar",
    );
  });

  it("prefers a broadcast's real per-state list over the generic marker, and doesn't mark that channel", () => {
    const digest = buildDigest(
      [
        buildMatch({
          broadcasts: [
            { channelId: "globo", displayName: "Globo", kind: "tv" as const, free: true, url: "", logoUrl: "", regionalCaveat: true, regionalDetail: "RJ, ES, MG e BA" },
          ],
        } as Partial<MatchView>),
      ],
      NOW,
    );
    expect(digest).toContain("— Globo 🆓");
    expect(digest).toContain("   📍 Globo em: RJ, ES, MG e BA");
    expect(digest).not.toContain("(regional)");
  });

  it("marks a channel that only has the generic caveat, with the footnote appearing exactly once", () => {
    const withCaveat = buildMatch({
      broadcasts: [
        { channelId: "globo", displayName: "Globo", kind: "tv" as const, free: true, url: "", logoUrl: "", regionalCaveat: true },
        { channelId: "premiere", displayName: "Premiere", kind: "tv" as const, free: false, url: "", logoUrl: "", regionalCaveat: false },
      ],
    } as Partial<MatchView>);
    const digest = buildDigest([withCaveat, { ...withCaveat, id: "b", kickoffUtc: "2026-09-05T23:00:00.000Z" }], NOW);

    expect(digest).toContain("— Globo 🆓 (regional), Premiere");
    expect(digest.match(/A transmissão pela Globo pode variar/g)).toHaveLength(1);
  });

  it("uses '(regional)', never a bare asterisk, so WhatsApp's own bold markup isn't broken", () => {
    const digest = buildDigest(
      [buildMatch({ broadcasts: [{ channelId: "globo", displayName: "Globo", kind: "tv" as const, free: true, url: "", logoUrl: "", regionalCaveat: true }] } as Partial<MatchView>)],
      NOW,
    );
    // Every "*" must be part of a matched bold pair, i.e. an even count per line.
    for (const line of digest.split("\n")) {
      expect((line.match(/\*/g) ?? []).length % 2).toBe(0);
    }
  });

  // The one question a reader can act on without leaving the message: can I
  // watch this without paying? About 1 in 5 broadcasts can, which is what
  // makes it worth a mark rather than a column.
  it("marks a free channel and spells the mark out once, at the foot of the digest", () => {
    const digest = buildDigest(
      [
        buildMatch({
          broadcasts: [
            { channelId: "getv", displayName: "ge TV", kind: "youtube" as const, free: true, url: "", logoUrl: "", regionalCaveat: false },
            { channelId: "premiere", displayName: "Premiere", kind: "tv" as const, free: false, url: "", logoUrl: "", regionalCaveat: false },
          ],
        } as Partial<MatchView>),
      ],
      NOW,
    );
    expect(digest).toContain("— ge TV 🆓, Premiere");
    expect(digest.match(/dá pra assistir de graça/g)).toHaveLength(1);
  });

  it("puts the free mark before the regional note — the channel is free either way, the caveat is about this coverage", () => {
    const digest = buildDigest(
      [buildMatch({ broadcasts: [{ channelId: "globo", displayName: "Globo", kind: "tv" as const, free: true, url: "", logoUrl: "", regionalCaveat: true }] } as Partial<MatchView>)],
      NOW,
    );
    expect(digest).toContain("— Globo 🆓 (regional)");
  });

  it("leaves the free footnote out entirely when nothing on the day is free", () => {
    expect(buildDigest([buildMatch()], NOW)).not.toContain("de graça");
  });

  it("says 'horário a confirmar' in place of the time when the kickoff time isn't set", () => {
    expect(buildDigest([buildMatch({ kickoffTimeConfirmed: false })], NOW)).toContain(
      "horário a confirmar *São Paulo x Atlético-MG*",
    );
  });

  it("says 'amanhã' in the header when the digest is about tomorrow, not just a different date", () => {
    expect(buildDigest([], NOW, "amanhã")).toContain("⚽ *Onde assistir aos jogos de amanhã — sábado, 5/set*");
  });

  it("still renders the header date on a day with no matches", () => {
    expect(buildDigest([], NOW)).toBe(
      [
        "⚽ *Onde assistir aos jogos de hoje — sábado, 5/set*",
        "",
        "Nenhum jogo hoje.",
        "",
        "https://ondevaipassar.com",
      ].join("\n"),
    );
  });
});
