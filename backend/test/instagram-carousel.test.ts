import type { MatchView } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { buildCarouselCaption } from "../src/instagram/caption.js";
import { MAX_CAROUSEL_ITEMS } from "../src/instagram/graphApiClient.js";
import { EUROPE_GROUP_ID, groupIntoPosts } from "../src/instagram/poster.js";

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
    kickoffUtc: "2026-09-05T21:30:00.000Z",
    kickoffTimeConfirmed: true,
    round: 26,
    status: "scheduled",
    broadcasts: [{ channelId: "premiere", displayName: "Premiere", url: "", logoUrl: "", regionalCaveat: false, instagramHandle: "premiere" }],
    ...overrides,
  } as MatchView;
}

describe("groupIntoPosts", () => {
  it("puts a whole competition into one post instead of one post per match", () => {
    const groups = groupIntoPosts([buildMatch({ id: "a" }), buildMatch({ id: "b" }), buildMatch({ id: "c" })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].matches).toHaveLength(3);
  });

  it("separates Brazilian competitions, Série A before B, with Europe last", () => {
    const groups = groupIntoPosts([
      buildMatch({ id: "eu", competitionId: "premier-league", competitionName: "Premier League" }),
      buildMatch({ id: "b", competitionId: "brasileirao-serie-b", competitionName: "Campeonato Brasileiro Série B" }),
      buildMatch({ id: "a" }),
    ]);
    expect(groups.map((g) => g.competitionId)).toEqual(["brasileirao-serie-a", "brasileirao-serie-b", EUROPE_GROUP_ID]);
  });

  // Split by competition, a normal midweek produced a stream of one- and
  // two-match European carousels. They go out as a single post instead.
  it("merges every foreign competition into one post", () => {
    const groups = groupIntoPosts([
      buildMatch({ id: "pl", competitionId: "premier-league", competitionName: "Premier League" }),
      buildMatch({ id: "ucl", competitionId: "champions-league", competitionName: "Champions League" }),
      buildMatch({ id: "efl", competitionId: "efl-cup", competitionName: "Copa da Liga Inglesa" }),
      buildMatch({ id: "br" }),
    ]);
    const europa = groups.find((g) => g.competitionId === EUROPE_GROUP_ID);
    expect(europa?.matches).toHaveLength(3);
    expect(europa?.competitionName).toBe("Jogos da Europa");
    expect(groups).toHaveLength(2);
  });

  // A carousel holds 10; a full Série A round is 10 matches and a busy
  // Sunday can exceed it. Dropping the overflow would silently hide games.
  it("splits a competition that exceeds the carousel limit, keeping every match", () => {
    const many = Array.from({ length: MAX_CAROUSEL_ITEMS + 3 }, (_, i) => buildMatch({ id: `m${i}` }));
    const groups = groupIntoPosts(many);

    expect(groups).toHaveLength(2);
    expect(groups[0].matches).toHaveLength(MAX_CAROUSEL_ITEMS);
    expect(groups[1].matches).toHaveLength(3);
    expect(groups.flatMap((g) => g.matches)).toHaveLength(many.length);
    expect(groups.map((g) => `${g.part}/${g.totalParts}`)).toEqual(["1/2", "2/2"]);
  });

  it("returns nothing when there is nothing to post", () => {
    expect(groupIntoPosts([])).toEqual([]);
  });
});

describe("buildCarouselCaption", () => {
  it("lists every match in the post and tags each broadcaster exactly once", () => {
    const caption = buildCarouselCaption("Campeonato Brasileiro Série A", [
      buildMatch({ id: "a", kickoffUtc: "2026-09-05T19:00:00.000Z" }),
      buildMatch({ id: "b", homeTeamName: "Flamengo", awayTeamName: "Vasco" }),
    ]);

    expect(caption).toContain("Campeonato Brasileiro Série A — jogos de sábado, 5/set");
    expect(caption).toContain("16h — São Paulo x Atlético-MG — Premiere");
    expect(caption).toContain("18h30 — Flamengo x Vasco — Premiere");
    // Both matches are on Premiere: the handle appears once, not twice.
    expect(caption.match(/@premiere/g)).toHaveLength(1);
  });

  it("numbers the post only when the competition was actually split", () => {
    const matches = [buildMatch()];
    expect(buildCarouselCaption("Série A", matches)).not.toContain("(1/1)");
    expect(buildCarouselCaption("Série A", matches, 2, 3)).toContain("(2/3)");
  });

  it("carries the per-state detail and the praça caveat through to the caption", () => {
    const caption = buildCarouselCaption("Brasileirão Feminino", [
      buildMatch({
        broadcasts: [{ channelId: "globo", displayName: "Globo", url: "", logoUrl: "", regionalCaveat: true, regionalDetail: "MG e PR" }],
      } as Partial<MatchView>),
    ]);
    expect(caption).toContain("Globo em: MG e PR (pode variar por praça dentro do estado)");
  });
});
