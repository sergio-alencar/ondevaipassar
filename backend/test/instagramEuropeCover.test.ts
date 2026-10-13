import type { MatchView } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { crestArt } from "../src/instagram/assets.js";
import { groupIntoPosts } from "../src/instagram/postGroups.js";

const match = (id: string, competitionId: string, competitionName: string) =>
  ({
    id,
    competitionId,
    competitionName,
    homeTeamId: null,
    homeTeamName: "A",
    homeTeamCrestUrl: "",
    awayTeamId: null,
    awayTeamName: "B",
    awayTeamCrestUrl: "",
    kickoffUtc: "2026-10-14T19:00:00.000Z",
    kickoffTimeConfirmed: true,
    round: null,
    status: "scheduled",
    broadcasts: [],
  }) as unknown as MatchView;

describe("European post naming", () => {
  it("is named after the competition when every match belongs to one", () => {
    const [group] = groupIntoPosts([match("1", "champions-league", "Champions League"), match("2", "champions-league", "Champions League")]);
    expect(group.competitionName).toBe("Champions League");
  });

  it("stays \"Jogos da Europa\" when competitions are mixed", () => {
    const [group] = groupIntoPosts([match("1", "champions-league", "Champions League"), match("2", "europa-league", "Liga Europa")]);
    expect(group.competitionName).toBe("Jogos da Europa");
  });
});

describe("national crests on the post", () => {
  it("has art for a country that is not featured (an opponent), SVG or PNG", async () => {
    const gray = await crestArt(null);
    for (const id of ["lituania_feminino", "grecia_feminino", "iraque_feminino", "suriname"]) {
      const art = await crestArt(id);
      expect(art.dataUri, id).not.toBe(gray.dataUri);
    }
  });
});
