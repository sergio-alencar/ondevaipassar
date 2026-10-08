import {
  brasiliaDayKey,
  canWatchBroadcast,
  canWatchMatch,
  channelGroupOf,
  CHANNEL_GROUP_ORDER,
  groupMatchesByCompetition,
  isWithinNextDaysInBrasilia,
  listChannels,
  parsePreferences,
  toggleId,
} from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";

describe("isWithinNextDaysInBrasilia", () => {
  // 18h BRT on Thu 8/out = 21:00Z.
  const now = new Date("2026-10-08T21:00:00.000Z");

  it("counts today and the next six days as a week", () => {
    expect(isWithinNextDaysInBrasilia("2026-10-08T22:30:00.000Z", 7, now)).toBe(true); // tonight
    expect(isWithinNextDaysInBrasilia("2026-10-14T22:30:00.000Z", 7, now)).toBe(true); // 6 days on
    expect(isWithinNextDaysInBrasilia("2026-10-15T22:30:00.000Z", 7, now)).toBe(false); // 7 days on: next week
  });

  // The reason it's calendar days and not 24h blocks: a game this morning is
  // still "today's" by the time the visitor opens the page in the evening.
  it("keeps a match already played earlier today", () => {
    expect(isWithinNextDaysInBrasilia("2026-10-08T14:00:00.000Z", 7, now)).toBe(true);
  });

  it("excludes yesterday", () => {
    expect(isWithinNextDaysInBrasilia("2026-10-07T23:00:00.000Z", 7, now)).toBe(false);
  });

  // 22h BRT on the 8th is 01:00Z on the 9th — UTC says tomorrow, Brasília says
  // tonight. The whole reason this uses Brasília's calendar.
  it("puts a late-night Brasília kickoff on its own day, not on the UTC date", () => {
    expect(brasiliaDayKey("2026-10-09T01:00:00.000Z")).toBe("2026-10-08");
    expect(isWithinNextDaysInBrasilia("2026-10-09T01:00:00.000Z", 1, now)).toBe(true); // today only
    expect(isWithinNextDaysInBrasilia("2026-10-09T04:00:00.000Z", 1, now)).toBe(false); // 01h BRT on the 9th
  });

  it("works for a single day", () => {
    expect(isWithinNextDaysInBrasilia("2026-10-08T23:00:00.000Z", 1, now)).toBe(true);
    expect(isWithinNextDaysInBrasilia("2026-10-09T15:00:00.000Z", 1, now)).toBe(false);
  });
});

describe("groupMatchesByCompetition", () => {
  const m = (competitionId: string, competitionName: string, kickoffUtc: string) => ({ competitionId, competitionName, kickoffUtc });

  // Real Saturday that produced the rule: European kickoffs are in the
  // morning, so chronological order buried Brasileirão under foreign leagues.
  it("puts Brazilian competitions before foreign ones, then Série A, B, C, whatever the kickoff order", () => {
    const groups = groupMatchesByCompetition([
      m("premier-league", "Premier League", "2026-10-10T11:30:00Z"),
      m("brasileirao-serie-c", "Campeonato Brasileiro Série C", "2026-10-10T12:00:00Z"),
      m("brasileirao-serie-b", "Campeonato Brasileiro Série B", "2026-10-10T13:00:00Z"),
      m("brasileirao-serie-a", "Campeonato Brasileiro Série A", "2026-10-10T21:30:00Z"),
    ]);
    expect(groups.map((g) => g.id)).toEqual(["brasileirao-serie-a", "brasileirao-serie-b", "brasileirao-serie-c", "premier-league"]);
  });

  it("keeps each group's matches in the order given", () => {
    const groups = groupMatchesByCompetition([
      m("brasileirao-serie-a", "Série A", "2026-10-10T19:00:00Z"),
      m("brasileirao-serie-b", "Série B", "2026-10-10T20:00:00Z"),
      m("brasileirao-serie-a", "Série A", "2026-10-10T22:00:00Z"),
    ]);
    expect(groups[0].matches.map((x) => x.kickoffUtc)).toEqual(["2026-10-10T19:00:00Z", "2026-10-10T22:00:00Z"]);
  });

  it("orders unpinned competitions by first appearance, i.e. chronologically", () => {
    const groups = groupMatchesByCompetition([
      m("libertadores", "Libertadores", "2026-10-10T20:00:00Z"),
      m("sul-americana", "Sul-Americana", "2026-10-10T22:00:00Z"),
    ]);
    expect(groups.map((g) => g.id)).toEqual(["libertadores", "sul-americana"]);
  });

  it("treats a competition missing from the registry as unpinned and Brazilian-side, not as an error", () => {
    expect(groupMatchesByCompetition([m("campeonato-paulista-feminino", "campeonato-paulista-feminino", "2026-10-10T20:00:00Z")])).toHaveLength(1);
  });
});

describe("channel groups", () => {
  it("separates open TV from paid TV, which `kind` alone cannot", () => {
    expect(channelGroupOf({ kind: "tv", free: true })).toBe("tv-aberta");
    expect(channelGroupOf({ kind: "tv" })).toBe("tv-paga"); // `free` is simply absent on a paid channel
  });

  it("keeps streaming apps and YouTube channels as their own groups, free or not", () => {
    expect(channelGroupOf({ kind: "streaming", free: true })).toBe("streaming"); // Pluto TV, OneFootball
    expect(channelGroupOf({ kind: "youtube", free: true })).toBe("youtube");
  });

  it("files every registered channel under a group the screens know how to show", () => {
    for (const channel of listChannels()) expect(CHANNEL_GROUP_ORDER).toContain(channelGroupOf(channel));
  });

  it("lists channels with unique ids", () => {
    const ids = listChannels().map((channel) => channel.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // The real Sunday case: these are open TV, and a viewer looking for "TV aberta" expects them.
  it("treats Globo, SBT and XSports as open TV and ESPN and Premiere as paid", () => {
    const group = (id: string) => channelGroupOf(listChannels().find((channel) => channel.id === id)!);
    expect(group("globo")).toBe("tv-aberta");
    expect(group("sbt")).toBe("tv-aberta");
    expect(group("xsports")).toBe("tv-aberta");
    expect(group("espn")).toBe("tv-paga");
    expect(group("premiere")).toBe("tv-paga");
  });
});

describe("preferences", () => {
  it("reads back what was stored", () => {
    expect(parsePreferences(JSON.stringify({ teams: ["flamengo"], channels: ["globo", "espn"] }))).toEqual({
      teams: ["flamengo"],
      channels: ["globo", "espn"],
    });
  });

  // localStorage is user-editable and holds whatever an older version wrote;
  // none of this may take the page down.
  it("falls back to empty on anything missing or malformed, without throwing", () => {
    const empty = { teams: [], channels: [] };
    expect(parsePreferences(null)).toEqual(empty);
    expect(parsePreferences(undefined)).toEqual(empty);
    expect(parsePreferences("")).toEqual(empty);
    expect(parsePreferences("{not json")).toEqual(empty);
    expect(parsePreferences("42")).toEqual(empty);
    expect(parsePreferences("null")).toEqual(empty);
    expect(parsePreferences('{"teams": "flamengo"}')).toEqual(empty);
  });

  it("drops entries that aren't non-empty strings, and duplicates", () => {
    expect(parsePreferences(JSON.stringify({ teams: ["a", "a", 7, null, "", "b"], channels: [] })).teams).toEqual(["a", "b"]);
  });

  it("caps the list, so a corrupted value can't become a huge render", () => {
    const many = Array.from({ length: 5000 }, (_, i) => `t${i}`);
    expect(parsePreferences(JSON.stringify({ teams: many, channels: [] })).teams.length).toBeLessThanOrEqual(500);
  });

  it("toggles an id in and out without mutating the original", () => {
    const original = ["a", "b"];
    expect(toggleId(original, "c")).toEqual(["a", "b", "c"]);
    expect(toggleId(original, "a")).toEqual(["b"]);
    expect(original).toEqual(["a", "b"]);
  });
});

describe("what a visitor can watch", () => {
  const free = { channelId: "cazetv", free: true };
  const paid = { channelId: "espn", free: false };

  // The default for someone who ticked nothing: open TV and YouTube still
  // count, because that is what "free" means.
  it("counts a free channel for everyone, even with nothing ticked", () => {
    expect(canWatchBroadcast(free, [])).toBe(true);
  });

  it("counts a paid channel only if the visitor has it", () => {
    expect(canWatchBroadcast(paid, [])).toBe(false);
    expect(canWatchBroadcast(paid, ["espn"])).toBe(true);
    expect(canWatchBroadcast(paid, ["premiere"])).toBe(false);
  });

  it("is true for a match when any one of its broadcasts is watchable", () => {
    expect(canWatchMatch([paid, free], [])).toBe(true);
    expect(canWatchMatch([paid], ["espn"])).toBe(true);
    expect(canWatchMatch([paid, { channelId: "premiere", free: false }], ["globo"])).toBe(false);
  });

  // "Transmissão a confirmar" is not something anyone can watch yet.
  it("is false for a match with no confirmed broadcast", () => {
    expect(canWatchMatch([], ["espn"])).toBe(false);
  });
});
