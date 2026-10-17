import type { MatchView } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { matchBlockMinHeight, STORY_BLOCKS_HEIGHT, STORY_DIVIDER_SPACE, STORY_MIN_CREST } from "../src/instagram/carouselTemplate.js";
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

  it("splits four matches into two stories of two, never three and one", () => {
    const stories = groupIntoStories(["1", "2", "3", "4"].map((id) => match(id, "brasileirao-serie-a")));
    expect(stories.map((story) => story.matches.length)).toEqual([2, 2]);
    expect(stories.flatMap((story) => story.matches.map((m) => m.id))).toEqual(["1", "2", "3", "4"]);
  });

  it("splits any number as evenly as it can", () => {
    const sizes = (count: number): number[] =>
      groupIntoStories(Array.from({ length: count }, (_, i) => match(`m${i}`, "brasileirao-serie-a"))).map((story) => story.matches.length);
    expect(sizes(1)).toEqual([1]);
    expect(sizes(2)).toEqual([2]);
    expect(sizes(3)).toEqual([3]);
    expect(sizes(5)).toEqual([3, 2]);
    expect(sizes(7)).toEqual([3, 2, 2]);
    expect(sizes(10)).toEqual([3, 3, 2, 2]);
  });

  it("holds fewer when the channel rows make the blocks too tall", () => {
    const eightChannels = ["1", "2", "3"].map((id) => match(id, "libertadores-feminina", 8));
    const need = eightChannels.reduce((total, m) => total + matchBlockMinHeight({ channels: m.broadcasts as never[] }, STORY_MIN_CREST), 0) + 2 * STORY_DIVIDER_SPACE;
    expect(need).toBeGreaterThan(STORY_BLOCKS_HEIGHT);
    const stories = groupIntoStories(eightChannels);
    for (const story of stories) {
      expect(story.matches.reduce((total, m) => total + matchBlockMinHeight({ channels: m.broadcasts as never[] }, STORY_MIN_CREST), 0) + Math.max(0, story.matches.length - 1) * STORY_DIVIDER_SPACE).toBeLessThanOrEqual(STORY_BLOCKS_HEIGHT);
    }
    expect(stories.flatMap((story) => story.matches)).toHaveLength(3);
  });

  it("returns nothing for an empty day", () => expect(groupIntoStories([])).toEqual([]));
});
