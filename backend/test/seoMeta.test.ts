import { allStaticPages, channelMeta, competitionMeta, findChannelById, indexablePages, NOT_FOUND_META, teamMeta, TEAMS } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";

describe("page meta", () => {
  const pages = allStaticPages();

  it("gives every page its own address, so the build never overwrites one page with another", () => {
    const paths = pages.map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  // A search result cuts a title near 60 characters and a description near 160.
  it("keeps titles and descriptions to a length a search result and a link preview show whole", () => {
    for (const page of pages) {
      expect(page.title.length, page.path).toBeLessThanOrEqual(70);
      expect(page.description.length, page.path).toBeLessThanOrEqual(175);
      expect(page.description.length, page.path).toBeGreaterThan(40);
    }
  });

  it("never gives two indexable pages the same title: that is what makes pages compete with each other", () => {
    const titles = indexablePages().map((page) => page.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("starts every address with a slash and never ends one with it (except the home page)", () => {
    for (const page of pages) {
      expect(page.path.startsWith("/"), page.path).toBe(true);
      if (page.path !== "/") expect(page.path.endsWith("/"), page.path).toBe(false);
    }
  });

  it("keeps the account, own settings, operator tool and 404 out of the index", () => {
    const noindex = pages.filter((page) => page.noindex).map((page) => page.path);
    expect(noindex).toEqual(expect.arrayContaining(["/conta", "/meus-canais", "/digest"]));
    expect(NOT_FOUND_META.noindex).toBe(true);
    expect(indexablePages().some((page) => page.noindex)).toBe(false);
  });

  it("leaves out the foreign clubs registered only for their crests", () => {
    const paths = new Set(indexablePages().map((page) => page.path));
    const foreign = TEAMS.find((team) => team.division === "FEMININO_EXTERIOR");
    expect(foreign).toBeDefined();
    expect(paths.has(teamMeta(foreign!).path)).toBe(false);
    expect(paths.has(teamMeta(TEAMS.find((team) => team.division === "A")!).path)).toBe(true);
  });

  it("names the team, competition and channel in their own pages", () => {
    expect(teamMeta({ id: "flamengo", displayName: "Flamengo" }).title).toContain("Flamengo");
    expect(competitionMeta({ id: "libertadores", displayName: "Taça Libertadores" }).path).toBe("/campeonato/libertadores");
    const cazetv = findChannelById("cazetv")!;
    expect(channelMeta(cazetv).description).toContain("sem pagar nada");
    expect(channelMeta({ ...cazetv, free: undefined }).description).not.toContain("sem pagar nada");
  });
});
