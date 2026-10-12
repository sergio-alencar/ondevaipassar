import { describe, expect, it } from "vitest";
import { resolveNationalFemininoCompetition } from "../src/ingest/femininoEnrichment.js";
import { isTrackedNationalFemininoTeam, resolveFemininoTeamId, resolveNationalFemininoTeamId } from "../src/ingest/femininoTeamResolver.js";
import { resolveCompetitionId } from "../src/ingest/competitionResolver.js";
import { isFollowedNationalCompetition } from "../src/ingest/onefootballEnrichment.js";

describe("national-team competition names", () => {
  // Spellings seen live, from OneFootball and futnatv.
  it.each([
    ["Amistosos Internacionais", "amistosos-internacionais"],
    ["Friendlies Women", "amistosos-internacionais-femininos"],
    ["Amistoso Feminino", "amistosos-internacionais-femininos"],
    ["UEFA Nations League - A", "liga-das-nacoes-uefa"],
    ["UEFA Nations League - D", "liga-das-nacoes-uefa"],
    ["Liga das Nações UEFA", "liga-das-nacoes-uefa"],
    ["CONCACAF Nations League", "liga-das-nacoes-concacaf"],
    ["Eliminatórias da UEFA Feminina", "eliminatorias-copa-do-mundo-feminina"],
    ["Copa do Mundo", "copa-do-mundo"],
  ])("files %s under %s", (raw, id) => {
    expect(resolveCompetitionId(raw)).toBe(id);
  });

  it("does not turn a club competition into a national one", () => {
    expect(resolveCompetitionId("Premier League")).toBe("premier-league");
    expect(resolveCompetitionId("Campeonato Brasileiro")).toBe("brasileirao-serie-a");
    expect(resolveCompetitionId("Amistosos")).toBe("amistosos"); // club friendlies keep their own
  });

  it("follows the registered national-team competitions and the senior friendlies, and nothing else a national team plays", () => {
    expect(isFollowedNationalCompetition("liga-das-nacoes-uefa")).toBe(true);
    expect(isFollowedNationalCompetition("amistosos-internacionais")).toBe(true);
    expect(isFollowedNationalCompetition("copa-do-mundo")).toBe(true);
    // The Asian Cup qualifiers would otherwise be filed under a stopgap id and shown.
    expect(isFollowedNationalCompetition(resolveCompetitionId("Taça AFC Asiática"))).toBe(false);
    expect(isFollowedNationalCompetition("brasileirao-serie-a")).toBe(false);
  });
});

describe("women's national teams in futnatv listings", () => {
  it("strips futnatv's ' F' suffix and finds the team", () => {
    expect(resolveNationalFemininoTeamId("Alemanha F")).toBe("alemanha_feminino");
    expect(resolveNationalFemininoTeamId("Brasil F")).toBe("brasil_feminino");
    expect(resolveNationalFemininoTeamId("Coreia do Sul F")).toBe("coreia_do_sul_feminino");
    expect(resolveNationalFemininoTeamId("Andorra F")).toBeNull();
  });

  it("tracks only the 18 qualified sides", () => {
    expect(isTrackedNationalFemininoTeam("japao_feminino")).toBe(true);
    expect(isTrackedNationalFemininoTeam("japao")).toBe(false);
    expect(isTrackedNationalFemininoTeam("flamengo_feminino")).toBe(false);
    expect(isTrackedNationalFemininoTeam(null)).toBe(false);
  });

  // "Brasil" is a country, not a club: only the national path may resolve it, and only to the women's team.
  it("keeps the club resolver out of it", () => {
    expect(resolveFemininoTeamId("Brasil F")).toBeNull();
    expect(resolveFemininoTeamId("Alemanha")).toBeNull();
  });

  it("recognises the women's national competitions, and leaves youth and clubs out", () => {
    expect(resolveNationalFemininoCompetition("Amistoso Feminino")).toBe("amistosos-internacionais-femininos");
    expect(resolveNationalFemininoCompetition("Eliminatórias da UEFA Feminina")).toBe("eliminatorias-copa-do-mundo-feminina");
    expect(resolveNationalFemininoCompetition("Copa do Mundo Feminina")).toBe("copa-do-mundo-feminina");
    expect(resolveNationalFemininoCompetition("Copa do Mundo Feminina sub-17")).toBeNull();
    expect(resolveNationalFemininoCompetition("Brasileirão Feminino")).toBeNull();
    expect(resolveNationalFemininoCompetition("Amistoso")).toBeNull(); // the men's friendly
  });
});
