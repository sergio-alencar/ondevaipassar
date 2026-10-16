import type { MatchView } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { matchBlockMinHeight, STORY_BLOCKS_HEIGHT } from "../src/instagram/carouselTemplate.js";
import { groupIntoStories } from "../src/instagram/storyGroups.js";

const channel = (id: string) => ({ channelId: id, displayName: id, kind: "tv", url: "", logoUrl: "", regionalCaveat: false });
const match = (id: string, competitionId: string, channels = 2): MatchView =>
  ({
    id,
    competitionId,
    competitionName: competitionId,
    homeTeamId: null,
    homeTeamName: "A",
    homeTeamCrestUrl: "",
    awayTeamId: null,
    awayTeamName: "B",
    awayTeamCrestUrl: "",
    kickoffUtc: "2026-10-16T22:00:00.000Z",
    kickoffTimeConfirmed: true,
    round: 1,
    status: "scheduled",
    broadcasts: Array.from({ length: channels }, (_, i) => channel(`c${i}`)),
  }) as unknown as MatchView;

describe("groupIntoStories", () => {
  it("makes one story per competition, in the digest's order", () => {
    const stories = groupIntoStories([match("e", "premier-league"), match("b", "brasileirao-serie-b"), match("a", "brasileirao-serie-a")]);
    expect(stories.map((story) => story.competitionId)).toEqual(["brasileirao-serie-a", "brasileirao-serie-b", "premier-league"]);
  });

  it("puts up to three matches of a competition in one story", () => {
    const stories = groupIntoStories(["1", "2", "3"].map((id) => match(id, "brasileirao-serie-a")));
    expect(stories).toHaveLength(1);
    expect(stories[0].matches).toHaveLength(3);
  });

  it("starts another story after three", () => {
    const stories = groupIntoStories(["1", "2", "3", "4"].map((id) => match(id, "brasileirao-serie-a")));
    expect(stories.map((story) => story.matches.length)).toEqual([3, 1]);
  });

  it("holds fewer when the channel rows make the blocks too tall", () => {
    const eightChannels = ["1", "2", "3"].map((id) => match(id, "libertadores-feminina", 8));
    const need = eightChannels.reduce((total, m) => total + matchBlockMinHeight({ channels: m.broadcasts as never[] }), 0);
    expect(need).toBeGreaterThan(STORY_BLOCKS_HEIGHT);
    const stories = groupIntoStories(eightChannels);
    for (const story of stories) {
      expect(story.matches.reduce((total, m) => total + matchBlockMinHeight({ channels: m.broadcasts as never[] }), 0)).toBeLessThanOrEqual(STORY_BLOCKS_HEIGHT);
    }
    expect(stories.flatMap((story) => story.matches)).toHaveLength(3);
  });

  it("returns nothing for an empty day", () => expect(groupIntoStories([])).toEqual([]));
});
