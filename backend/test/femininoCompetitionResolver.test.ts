import { describe, expect, it } from "vitest";
import { decideListing, findKnownMatch, resolveFemininoCompetition, type KnownMatch } from "../src/ingest/femininoEnrichment.js";
import { isTrackedBrazilianFemininoTeam, resolveFemininoTeamId } from "../src/ingest/femininoTeamResolver.js";

const idOf = (competition: string): string | null => resolveFemininoCompetition(competition)?.competitionId ?? null;

describe("resolveFemininoCompetition", () => {
  it("recognizes the Brasileirão's spellings, and keeps requiring both sides for it", () => {
    expect(resolveFemininoCompetition("Brasileirão Feminino")).toEqual({ competitionId: "brasileirao-feminino", requireBothSides: true });
    expect(idOf("Campeonato Brasileiro Feminino")).toBe("brasileirao-feminino");
  });

  // The 2026 edition runs 15-31/out in Ecuador, so futnatv hadn't listed it
  // yet when this was written — the exact string it will use is unknown, and
  // these are the variants the competition is actually published under.
  it("recognizes the Libertadores Feminina under any of the names it goes by", () => {
    expect(idOf("Copa Libertadores Feminina")).toBe("libertadores-feminina");
    expect(idOf("Libertadores Feminina")).toBe("libertadores-feminina");
    expect(idOf("CONMEBOL Libertadores Feminina")).toBe("libertadores-feminina");
    expect(resolveFemininoCompetition("Copa Libertadores Feminina")?.requireBothSides).toBe(false);
  });

  it("ingests the Copa do Brasil Feminina under its own id, not the Brasileirão's", () => {
    expect(idOf("Copa do Brasil Feminina")).toBe("copa-do-brasil-feminina");
  });

  // "Supercopa do Brasil Feminina" CONTAINS the text "copa do brasil". A plain
  // substring match filed it under the Copa do Brasil's id — two different
  // tournaments, one competition. Caught by this very test the first time.
  it("keeps the Supercopa do Brasil Feminina apart from the Copa do Brasil Feminina", () => {
    expect(idOf("Supercopa do Brasil Feminina")).toBe("supercopa-do-brasil-feminina");
    expect(idOf("Copa do Brasil Feminina")).toBe("copa-do-brasil-feminina");
  });

  // "qualquer campeonato que envolva aqueles times que temos no nosso radar":
  // a competition without a registry entry still gets in, under a stopgap id,
  // instead of being dropped until someone adds it.
  it("gives a competition with no registry entry a stopgap slug id instead of dropping it", () => {
    expect(idOf("Campeonato Paulista Feminino")).toBe("campeonato-paulista-feminino");
    expect(idOf("Copa do Nordeste Feminina")).toBe("copa-do-nordeste-feminina");
  });

  // The men's tournament carries no "feminin" marker, and the women's team
  // resolver must never see a men's listing — that separation is the whole
  // reason femininoTeamResolver.ts exists.
  it("never claims men's football", () => {
    expect(idOf("Taça Conmebol Libertadores")).toBeNull();
    expect(idOf("Copa Libertadores")).toBeNull();
    expect(idOf("Campeonato Brasileiro Série A")).toBeNull();
  });

  // Same shape as the Youth League bug on the men's side: the clubs are the
  // same institutions, so only the competition name separates the two.
  it("excludes the age-group editions that share the senior name", () => {
    expect(idOf("Copa Libertadores Feminina Sub-20")).toBeNull();
    expect(idOf("Brasileirão Feminino Sub-17")).toBeNull();
    expect(idOf("Copa do Brasil Feminina Sub-20")).toBeNull();
  });
});

describe("foreign clubs in the women's resolver", () => {
  // None of these spellings has been seen from a real source yet — the
  // competition starts after this was written — so the point is that dots and
  // spacing don't decide whether a club is recognised.
  it("resolves the opponents however the punctuation falls", () => {
    expect(resolveFemininoTeamId("L.D.U. Quito")).toBe("ldu_feminino");
    expect(resolveFemininoTeamId("Colo Colo")).toBe("colo_colo_feminino");
    expect(resolveFemininoTeamId("Colo-Colo")).toBe("colo_colo_feminino");
    expect(resolveFemininoTeamId("Caracas F.C.")).toBe("caracas_feminino");
    expect(resolveFemininoTeamId("U. de Chile")).toBe("universidad_de_chile_feminino");
    expect(resolveFemininoTeamId("Independiente del Valle")).toBe("independiente_del_valle_feminino");
    expect(resolveFemininoTeamId("Bolívar")).toBe("bolivar_feminino");
  });

  // UOL's own schedule tags each opponent with a country, and once got the
  // code wrong ("Colo-Colo (COL)" — Colo-Colo is Chilean). The tag can't be
  // trusted, so it's discarded rather than interpreted.
  it("discards a country tag a source appends to the club name, right or wrong", () => {
    expect(resolveFemininoTeamId("Colo-Colo (CHI)")).toBe("colo_colo_feminino");
    expect(resolveFemininoTeamId("Colo-Colo (COL)")).toBe("colo_colo_feminino");
    expect(resolveFemininoTeamId("Colo-Colo-CHI")).toBe("colo_colo_feminino");
    expect(resolveFemininoTeamId("Nacional (URU)")).toBe("nacional_feminino");
    expect(resolveFemininoTeamId("Caracas-VEN")).toBe("caracas_feminino");
  });

  // "LDU" and "IDV" end in three capitals, the shape the hyphenated tag is
  // recognised by — they must survive it.
  it("does not mistake a club's own acronym for a country tag", () => {
    expect(resolveFemininoTeamId("LDU")).toBe("ldu_feminino");
    expect(resolveFemininoTeamId("IDV")).toBe("independiente_del_valle_feminino");
    expect(resolveFemininoTeamId("Club LDU")).toBeNull(); // not an alias; the point is it isn't half-eaten into "club"
  });

  it("resolves the common short and formal forms", () => {
    expect(resolveFemininoTeamId("LDU de Quito")).toBe("ldu_feminino");
    expect(resolveFemininoTeamId("C.D. Colo-Colo")).toBe("colo_colo_feminino");
    expect(resolveFemininoTeamId("Univ. de Chile")).toBe("universidad_de_chile_feminino");
    expect(resolveFemininoTeamId("I. del Valle")).toBe("independiente_del_valle_feminino");
  });

  it("still resolves the Brazilian clubs first, untouched by the new aliases", () => {
    expect(resolveFemininoTeamId("Corinthians")).toBe("corinthians_feminino");
    expect(resolveFemininoTeamId("Palmeiras")).toBe("palmeiras_feminino");
    expect(resolveFemininoTeamId("Cruzeiro")).toBe("cruzeiro_feminino");
  });

  // What stops "Colo-Colo x Caracas" from being ingested: recognising a club
  // is not the same as following it.
  it("separates the clubs we follow from the opponents we merely recognise", () => {
    expect(isTrackedBrazilianFemininoTeam("corinthians_feminino")).toBe(true);
    expect(isTrackedBrazilianFemininoTeam("colo_colo_feminino")).toBe(false);
    expect(isTrackedBrazilianFemininoTeam(null)).toBe(false);
  });

  it("resolves the two Colombian clubs, with and without the accent", () => {
    expect(resolveFemininoTeamId("Santa Fé")).toBe("santa_fe_feminino");
    expect(resolveFemininoTeamId("Santa Fe")).toBe("santa_fe_feminino");
    expect(resolveFemininoTeamId("Independiente Santa Fe")).toBe("santa_fe_feminino");
    expect(resolveFemininoTeamId("Deportivo Cali")).toBe("deportivo_cali_feminino");
  });

  // América de Cali is a different club (and has men's art in this repo):
  // a bare "Cali" must not pick a side.
  it("does not guess between the two Cali clubs from a bare name", () => {
    expect(resolveFemininoTeamId("Cali")).toBeNull();
    expect(resolveFemininoTeamId("América de Cali")).toBeNull();
  });

  it("does not resolve a club it doesn't know", () => {
    expect(resolveFemininoTeamId("Millonarios")).toBeNull();
  });
});

describe("findKnownMatch", () => {
  const seeded: KnownMatch = {
    id: "manual-fixtures:libertadores-feminina:corinthians_feminino__caracas_feminino__2026-10-18",
    competitionId: "libertadores-feminina",
    homeTeamId: "corinthians_feminino",
    awayTeamId: "caracas_feminino",
    kickoffUtc: "2026-10-19T00:00:00.000Z", // 21h BRT on the 18th
    sourceId: "manual-fixtures",
  };
  const base = { competitionId: "libertadores-feminina", kickoffUtc: "2026-10-19T00:00:00.000Z" };

  it("finds the seeded game when the other source lists the sides the other way round", () => {
    expect(findKnownMatch([seeded], { ...base, homeTeamId: "caracas_feminino", awayTeamId: "corinthians_feminino" })).toBe(seeded);
  });

  // The case it exists for: a Colombian opponent still to be decided is a
  // placeholder one side and a real club the other, so only the Brazilian
  // club can anchor the match.
  it("anchors on the Brazilian club when the opponent is unknown on one side", () => {
    const placeholder: KnownMatch = { ...seeded, awayTeamId: null };
    expect(findKnownMatch([placeholder], { ...base, homeTeamId: "corinthians_feminino", awayTeamId: null })).toBe(placeholder);
  });

  it("tolerates a kickoff that differs by a few hours", () => {
    expect(
      findKnownMatch([seeded], { ...base, kickoffUtc: "2026-10-18T20:00:00.000Z", homeTeamId: "corinthians_feminino", awayTeamId: "caracas_feminino" }),
    ).toBe(seeded);
  });

  it("does not merge two games of the same club days apart", () => {
    expect(
      findKnownMatch([seeded], { ...base, kickoffUtc: "2026-10-22T00:00:00.000Z", homeTeamId: "corinthians_feminino", awayTeamId: "colo_colo_feminino" }),
    ).toBeUndefined();
  });

  it("does not merge across competitions", () => {
    expect(
      findKnownMatch([seeded], { ...base, competitionId: "copa-do-brasil-feminina", homeTeamId: "corinthians_feminino", awayTeamId: "caracas_feminino" }),
    ).toBeUndefined();
  });

  it("never merges on a foreign club alone, which is no anchor", () => {
    expect(findKnownMatch([seeded], { ...base, homeTeamId: "caracas_feminino", awayTeamId: "colo_colo_feminino" })).toBeUndefined();
  });

  it("does not merge a different Brazilian club's game on the same night", () => {
    expect(findKnownMatch([seeded], { ...base, homeTeamId: "palmeiras_feminino", awayTeamId: "belgrano_feminino" })).toBeUndefined();
  });
});

describe("decideListing", () => {
  it("ingests a Brasileirão game only when both clubs resolve, and flags a naming gap otherwise", () => {
    expect(decideListing(true, "corinthians_feminino", "palmeiras_feminino")).toBe("ingest");
    expect(decideListing(true, "corinthians_feminino", null)).toBe("unresolved");
    expect(decideListing(true, null, null)).toBe("unresolved");
  });

  it("ingests an open competition's game as soon as one club of ours is in it", () => {
    expect(decideListing(false, "corinthians_feminino", null)).toBe("ingest");
    expect(decideListing(false, null, "palmeiras_feminino")).toBe("ingest");
    expect(decideListing(false, "colo_colo_feminino", "cruzeiro_feminino")).toBe("ingest");
  });

  // The regression this exists for: national-team games (UEFA qualifiers,
  // Brazil x Argentina friendlies) resolve to nothing on both sides, and were
  // being counted as unresolved — flipping a healthy source to "partial".
  it("quietly skips a game with no club of ours, even when neither side is recognised at all", () => {
    expect(decideListing(false, null, null)).toBe("skip");
  });

  it("skips two foreign clubs meeting, which is recognised but not followed", () => {
    expect(decideListing(false, "colo_colo_feminino", "caracas_feminino")).toBe("skip");
  });
});
