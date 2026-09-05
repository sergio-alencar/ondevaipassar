import type { MatchView } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { buildDigest, buildThreadDigest, countCharacters, X_CHARACTER_LIMIT } from "../src/digest/digest.js";

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
    broadcasts: [{ channelId: "premiere", displayName: "Premiere", url: "", logoUrl: "", regionalCaveat: false }],
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
        "18h30 — *São Paulo x Atlético-MG* — Transmissão: Premiere",
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
    expect(digest.indexOf("16h —")).toBeLessThan(digest.indexOf("19h —"));
  });

  it("says 'Transmissão a confirmar' for a match with no broadcast, matching the site's own wording", () => {
    expect(buildDigest([buildMatch({ broadcasts: [] })], NOW)).toContain(
      "18h30 — *São Paulo x Atlético-MG* — Transmissão a confirmar",
    );
  });

  it("prefers a broadcast's real per-state list over the generic marker, and doesn't mark that channel", () => {
    const digest = buildDigest(
      [
        buildMatch({
          broadcasts: [
            { channelId: "globo", displayName: "Globo", url: "", logoUrl: "", regionalCaveat: true, regionalDetail: "RJ, ES, MG e BA" },
          ],
        } as Partial<MatchView>),
      ],
      NOW,
    );
    expect(digest).toContain("Transmissão: Globo");
    expect(digest).toContain("   📍 Globo em: RJ, ES, MG e BA");
    expect(digest).not.toContain("(regional)");
  });

  it("marks a channel that only has the generic caveat, with the footnote appearing exactly once", () => {
    const withCaveat = buildMatch({
      broadcasts: [
        { channelId: "globo", displayName: "Globo", url: "", logoUrl: "", regionalCaveat: true },
        { channelId: "premiere", displayName: "Premiere", url: "", logoUrl: "", regionalCaveat: false },
      ],
    } as Partial<MatchView>);
    const digest = buildDigest([withCaveat, { ...withCaveat, id: "b", kickoffUtc: "2026-09-05T23:00:00.000Z" }], NOW);

    expect(digest).toContain("Transmissão: Globo (regional), Premiere");
    expect(digest.match(/= transmissão pela Globo pode variar/g)).toHaveLength(1);
  });

  it("uses '(regional)', never a bare asterisk, so WhatsApp's own bold markup isn't broken", () => {
    const digest = buildDigest(
      [buildMatch({ broadcasts: [{ channelId: "globo", displayName: "Globo", url: "", logoUrl: "", regionalCaveat: true }] } as Partial<MatchView>)],
      NOW,
    );
    // Every "*" must be part of a matched bold pair, i.e. an even count per line.
    for (const line of digest.split("\n")) {
      expect((line.match(/\*/g) ?? []).length % 2).toBe(0);
    }
  });

  it("says 'horário a confirmar' in place of the time when the kickoff time isn't set", () => {
    expect(buildDigest([buildMatch({ kickoffTimeConfirmed: false })], NOW)).toContain(
      "horário a confirmar — *São Paulo x Atlético-MG*",
    );
  });

  it("says 'amanhã' in the header when the digest is about tomorrow, not just a different date", () => {
    expect(buildDigest([], NOW, "amanhã")).toContain("⚽ *Onde assistir aos jogos de amanhã — sábado, 5/set*");
    expect(buildThreadDigest([], NOW, "amanhã")[0]).toContain("⚽ Onde assistir aos jogos de amanhã — sábado, 5/set");
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

describe("buildThreadDigest", () => {
  it("opens with the day's headline and closes with the site link", () => {
    const posts = buildThreadDigest([buildMatch()], NOW);
    expect(posts[0]).toContain("⚽ Onde assistir aos jogos de hoje — sábado, 5/set");
    expect(posts[0]).toContain("1 jogo.");
    expect(posts.at(-1)).toContain("https://ondevaipassar.com");
  });

  it("numbers every post, and the numbering matches the real post count", () => {
    const posts = buildThreadDigest([buildMatch(), buildMatch({ id: "b", competitionId: "bundesliga", competitionName: "Bundesliga" })], NOW);
    posts.forEach((post, index) => expect(post.endsWith(`${index + 1}/${posts.length}`)).toBe(true));
  });

  it("never writes WhatsApp's *bold* markup, which X would render literally", () => {
    const posts = buildThreadDigest([buildMatch()], NOW);
    for (const post of posts) expect(post).not.toContain("*");
  });

  it("keeps every post within X's limit, numbering included, even with many matches in one competition", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      buildMatch({ id: `m${index}`, kickoffUtc: `2026-09-05T${String(12 + index).padStart(2, "0")}:00:00.000Z` }),
    );
    const posts = buildThreadDigest(many, NOW);
    for (const post of posts) expect(countCharacters(post)).toBeLessThanOrEqual(X_CHARACTER_LIMIT);
  });

  it("repeats the competition name with 'cont.' when its matches spill into another post", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      buildMatch({ id: `m${index}`, kickoffUtc: `2026-09-05T${String(12 + index).padStart(2, "0")}:00:00.000Z` }),
    );
    const joined = buildThreadDigest(many, NOW).join("\n");
    expect(joined).toContain("Campeonato Brasileiro Série A (cont.)");
  });

  it("never splits a single match across two posts", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      buildMatch({ id: `m${index}`, kickoffUtc: `2026-09-05T${String(12 + index).padStart(2, "0")}:00:00.000Z` }),
    );
    for (const post of buildThreadDigest(many, NOW)) {
      // Every pairing line that appears must carry its whole "Transmissão:" tail.
      for (const line of post.split("\n")) {
        if (line.includes(" x ") && line.includes("—")) expect(line).toMatch(/Transmissão/);
      }
    }
  });

  it("puts Brazilian competitions before foreign ones, and Série A before B before C", () => {
    const joined = buildThreadDigest(
      [
        buildMatch({ id: "eu", competitionId: "premier-league", competitionName: "Premier League", kickoffUtc: "2026-09-05T11:30:00.000Z" }),
        buildMatch({ id: "c", competitionId: "brasileirao-serie-c", competitionName: "Campeonato Brasileiro Série C", kickoffUtc: "2026-09-05T12:00:00.000Z" }),
        buildMatch({ id: "b", competitionId: "brasileirao-serie-b", competitionName: "Campeonato Brasileiro Série B", kickoffUtc: "2026-09-05T13:00:00.000Z" }),
        buildMatch({ id: "a", kickoffUtc: "2026-09-05T21:30:00.000Z" }),
      ],
      NOW,
    ).join("\n");

    expect(joined.indexOf("Série A")).toBeLessThan(joined.indexOf("Série B"));
    expect(joined.indexOf("Série B")).toBeLessThan(joined.indexOf("Série C"));
    expect(joined.indexOf("Série C")).toBeLessThan(joined.indexOf("Premier League"));
  });

  it("counts by code point, so an emoji isn't double-counted against the limit", () => {
    expect(countCharacters("⚽")).toBe(1);
    expect(countCharacters("🇧🇷")).toBe(2); // a real 2-code-point flag, not a mistake
  });
});
