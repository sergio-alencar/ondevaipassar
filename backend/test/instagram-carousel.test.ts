import type { MatchView } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { buildCarouselCaption, buildDailyCaption } from "../src/instagram/caption.js";
import { MAX_CAROUSEL_ITEMS } from "../src/instagram/graphApiClient.js";
import { DAILY_GROUP_ID, EUROPE_GROUP_ID, groupIntoDailyPosts, groupIntoPosts } from "../src/instagram/postGroups.js";
import { channelRows } from "../src/instagram/carouselTemplate.js";

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
    broadcasts: [{ channelId: "premiere", displayName: "Premiere", kind: "tv" as const, url: "", logoUrl: "", regionalCaveat: false, instagramHandle: "premiere" }],
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
        broadcasts: [{ channelId: "globo", displayName: "Globo", kind: "tv" as const, url: "", logoUrl: "", regionalCaveat: true, regionalDetail: "MG e PR" }],
      } as Partial<MatchView>),
    ]);
    expect(caption).toContain("Globo em: MG e PR (pode variar por praça dentro do estado)");
  });
});

describe("channelRows: balanced rows, never a stranded pair", () => {
  const sizes = (count: number): number[] => channelRows(new Array<number>(count).fill(0)).map((row) => row.length);
  it("keeps up to six on one row", () => {
    expect(sizes(1)).toEqual([1]);
    expect(sizes(6)).toEqual([6]);
  });
  it("splits the rest as evenly as it can", () => {
    expect(sizes(7)).toEqual([4, 3]);
    expect(sizes(8)).toEqual([4, 4]);
    expect(sizes(9)).toEqual([5, 4]);
  });
});

describe("groupIntoDailyPosts: one feed post with the whole day", () => {
  it("puts every match, of every competition, in a single post", () => {
    const groups = groupIntoDailyPosts([
      buildMatch({ id: "eu", competitionId: "premier-league", competitionName: "Premier League" }),
      buildMatch({ id: "b", competitionId: "brasileirao-serie-b", competitionName: "Campeonato Brasileiro Série B" }),
      buildMatch({ id: "a" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].competitionId).toBe(DAILY_GROUP_ID);
    // Brazilian first, Série A before B, then the rest.
    expect(groups[0].matches.map((match) => match.id)).toEqual(["a", "b", "eu"]);
  });

  it("holds cover + 9 slides of two at the default limit of 10 images (18 matches)", () => {
    const eighteen = Array.from({ length: 18 }, (_, i) => buildMatch({ id: `m${i}` }));
    expect(groupIntoDailyPosts(eighteen, 10)).toHaveLength(1);
  });

  it("splits a bigger day evenly, never leaving a lone match for the second post", () => {
    const nineteen = Array.from({ length: 19 }, (_, i) => buildMatch({ id: `m${i}` }));
    const groups = groupIntoDailyPosts(nineteen, 10);
    expect(groups.map((g) => g.matches.length)).toEqual([10, 9]);
    expect(groups.flatMap((g) => g.matches)).toHaveLength(19);
  });

  it("holds twice as many when the API takes 20 images", () => {
    const thirtyEight = Array.from({ length: 38 }, (_, i) => buildMatch({ id: `m${i}` }));
    expect(groupIntoDailyPosts(thirtyEight, 20)).toHaveLength(1);
  });

  it("returns nothing for an empty day", () => expect(groupIntoDailyPosts([])).toEqual([]));
});

describe("buildDailyCaption", () => {
  const day = [
    buildMatch({ id: "a" }),
    buildMatch({ id: "b", competitionId: "brasileirao-serie-b", competitionName: "Campeonato Brasileiro Série B" }),
  ];

  it("follows Sérgio's format, with no dashes", () => {
    const caption = buildDailyCaption([
      buildMatch({ id: "a", homeTeamName: "Mirassol", awayTeamName: "Internacional", kickoffUtc: "2026-10-16T23:00:00.000Z" }),
      buildMatch({
        id: "b",
        competitionId: "brasileirao-serie-b",
        competitionName: "Campeonato Brasileiro Série B",
        homeTeamName: "Ponte Preta",
        awayTeamName: "Atlético-GO",
        kickoffUtc: "2026-10-16T22:30:00.000Z",
        broadcasts: [{ channelId: "disneyplus", displayName: "Disney+", kind: "streaming", url: "", logoUrl: "", regionalCaveat: false, instagramHandle: "disneyplusbr" } as MatchView["broadcasts"][number]],
      }),
    ]);
    expect(caption).toBe(
      ["Jogos de sexta, 16/out", "", "Brasileirão Série A", "20h Mirassol x Internacional | Premiere", "", "Brasileirão Série B", "19h30 Ponte Preta x Atlético-GO | Disney+", "", "@premiere @disneyplusbr"].join("\n"),
    );
    expect(caption).not.toMatch(/[—–]/);
  });

  it("writes the regional note without a dash", () => {
    const globo = { channelId: "globo", displayName: "Globo", kind: "tv", url: "", logoUrl: "", regionalCaveat: true } as MatchView["broadcasts"][number];
    expect(buildDailyCaption([buildMatch({ broadcasts: [globo] })])).not.toMatch(/[—–]/);
  });

  it("lists each competition with its matches, and each handle once", () => {
    const caption = buildDailyCaption(day);
    expect(caption).toContain("Brasileirão Série A");
    expect(caption).toContain("Brasileirão Série B");
    expect(caption.split("@premiere")).toHaveLength(2);
  });

  it("stays inside Instagram's 2,200 characters on a very full day", () => {
    const full = Array.from({ length: 60 }, (_, i) => buildMatch({ id: `m${i}`, homeTeamName: `Time Muito Comprido Número ${i}` }));
    expect(buildDailyCaption(full).length).toBeLessThanOrEqual(2200);
  });
});
