import { describe, expect, it } from "vitest";
import { findStaleNationalRows, resolveNationalFemininoCompetition } from "../src/ingest/femininoEnrichment.js";
import { isTrackedNationalFemininoTeam, resolveFemininoTeamId, resolveNationalFemininoTeamId } from "../src/ingest/femininoTeamResolver.js";
import { resolveCompetitionId } from "../src/ingest/competitionResolver.js";
import { isFollowedNationalCompetition, isOrphanNationalRow } from "../src/ingest/onefootballEnrichment.js";

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
    expect(resolveNationalFemininoTeamId("Países Baixos F")).toBe("holanda_feminino");
    expect(resolveNationalFemininoTeamId("Atlantida F")).toBeNull();
  });

  // Every country resolves, as an opponent with a crest; only the top 20 make a game worth ingesting.
  it("resolves every country but tracks only the FIFA top 20", () => {
    expect(resolveNationalFemininoTeamId("Andorra F")).toBe("andorra_feminino");
    expect(isTrackedNationalFemininoTeam("andorra_feminino")).toBe(false);
    expect(isTrackedNationalFemininoTeam("malawi_feminino")).toBe(false);
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

describe("cleaning up rows the resolver has outgrown", () => {
  // Real bug: Singapura x Paraguai came from Paraguai's page; once Paraguai left the
  // tab nothing fetched that page, nothing refreshed the row, and it stayed for good.
  it("flags a national row with no featured side, from its names", () => {
    const base = { competitionId: "amistosos-internacionais" };
    expect(isOrphanNationalRow({ ...base, homeTeamNameRaw: "Singapura", awayTeamNameRaw: "Paraguai" })).toBe(true);
    expect(isOrphanNationalRow({ ...base, homeTeamNameRaw: "Singapura", awayTeamNameRaw: "Brasil" })).toBe(false);
    expect(isOrphanNationalRow({ ...base, homeTeamNameRaw: "Países Baixos", awayTeamNameRaw: "Chile" })).toBe(false); // Holanda is featured
  });

  it("never touches a row from a competition that is not a national-team one", () => {
    expect(isOrphanNationalRow({ competitionId: "champions-league", homeTeamNameRaw: "Fenerbahçe", awayTeamNameRaw: "Roma" })).toBe(false);
    expect(isOrphanNationalRow({ competitionId: "brasileirao-serie-a", homeTeamNameRaw: "Paraguai", awayTeamNameRaw: "Chile" })).toBe(false);
  });

  // The same game, listed under a new id once an opponent got a team id.
  it("finds a women's national row futnatv now lists under another id, inside its window only", () => {
    const row = (id: string, kickoffUtc: string, sourceId = "futnatv-feminino", competitionId = "amistosos-internacionais-femininos") => ({ id, competitionId, kickoffUtc, sourceId });
    const known = [
      row("futnatv-feminino:canada__dinamarca_feminino__2026-10-12", "2026-10-12T19:30:00.000Z"),
      row("futnatv-feminino:canada_feminino__dinamarca_feminino__2026-10-12", "2026-10-12T19:30:00.000Z"),
      row("futnatv-feminino:velho__x__2026-09-01", "2026-09-01T19:30:00.000Z"),
      row("onefootball:1", "2026-10-12T19:30:00.000Z", "onefootball"),
      row("futnatv-feminino:a__b__2026-10-12", "2026-10-12T19:30:00.000Z", "futnatv-feminino", "brasileirao-feminino"),
    ];
    const current = new Set(["futnatv-feminino:canada_feminino__dinamarca_feminino__2026-10-12"]);
    expect(findStaleNationalRows(known, current, "2026-10-04T00:00:00.000Z")).toEqual(["futnatv-feminino:canada__dinamarca_feminino__2026-10-12"]);
  });
});
