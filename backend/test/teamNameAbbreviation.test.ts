import { describe, expect, it } from "vitest";
import { abbreviateTeamName } from "../src/instagram/teamNameAbbreviation.js";

describe("abbreviateTeamName", () => {
  it("shortens a dictionary word regardless of accent/case", () => {
    expect(abbreviateTeamName("Universidad Católica")).toBe("Univ. Católica");
    expect(abbreviateTeamName("UNIVERSIDADE")).toBe("Univ.");
  });

  it("leaves words with no dictionary entry untouched", () => {
    expect(abbreviateTeamName("Palmeiras")).toBe("Palmeiras");
  });

  it("shortens every matching word in a multi-word name", () => {
    expect(abbreviateTeamName("Club Atlético Deportivo")).toBe("Club Atl. Dep.");
  });

  it("shortens a whole name to the one Brazilian coverage actually uses", () => {
    expect(abbreviateTeamName("Manchester City")).toBe("Man City");
    expect(abbreviateTeamName("Paris Saint-Germain")).toBe("PSG");
    expect(abbreviateTeamName("Borussia Dortmund")).toBe("Dortmund");
    expect(abbreviateTeamName("Stade Brestois 29")).toBe("Brest");
  });

  it("matches a whole name regardless of case and accents", () => {
    expect(abbreviateTeamName("BAYERN DE MUNIQUE")).toBe("FC Bayern");
  });

  // These read as a different club once shortened the obvious way:
  // "Athletic" is Série B's Athletic Club here, and "Racing" is Racing
  // Club. Left long on purpose rather than made ambiguous.
  it("leaves names alone when the short form would collide with another club", () => {
    expect(abbreviateTeamName("Athletic Bilbao")).toBe("Athletic Bilbao");
    expect(abbreviateTeamName("Racing Santander")).toBe("Racing Santander");
  });

  it("still falls back to the per-word dictionary for a name with no whole-name entry", () => {
    expect(abbreviateTeamName("Independiente del Valle")).toBe("Indep. del Valle");
  });
});
