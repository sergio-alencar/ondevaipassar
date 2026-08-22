import { describe, expect, it } from "vitest";
import { resolveCompetitionId } from "../src/ingest/competitionResolver.js";

describe("resolveCompetitionId", () => {
  it("resolves known ge.globo championship names to canonical ids", () => {
    expect(resolveCompetitionId("Campeonato Brasileiro")).toBe("brasileirao-serie-a");
    expect(resolveCompetitionId("Campeonato Brasileiro Série B")).toBe("brasileirao-serie-b");
    expect(resolveCompetitionId("Copa do Brasil")).toBe("copa-do-brasil");
  });

  it("distinguishes Libertadores/Sul-Americana from their two observed name variants each", () => {
    expect(resolveCompetitionId("Taça Conmebol Libertadores")).toBe("libertadores");
    expect(resolveCompetitionId("Copa Conmebol Libertadores")).toBe("libertadores");
    expect(resolveCompetitionId("Copa Conmebol Sul-Americana")).toBe("sul-americana");
    expect(resolveCompetitionId("Copa Sul-Americana")).toBe("sul-americana");
  });

  it("is accent- and case-insensitive", () => {
    expect(resolveCompetitionId("campeonato gaucho")).toBe("campeonato-gaucho");
    expect(resolveCompetitionId("CAMPEONATO GAÚCHO")).toBe("campeonato-gaucho");
  });

  it("gives an unrecognized competition a stable slugified id instead of dropping it", () => {
    expect(resolveCompetitionId("Campeonato Alagoano")).toBe("campeonato-alagoano");
    // Stable: the same unrecognized name always slugifies to the same id,
    // so re-ingesting doesn't fragment it into duplicate stopgap rows.
    expect(resolveCompetitionId("Campeonato Alagoano")).toBe(resolveCompetitionId("Campeonato Alagoano"));
  });
});
