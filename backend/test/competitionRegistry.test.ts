import { COMPETITIONS, findCompetitionById, humanizeCompetitionId, slugify } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { resolveCompetitionId } from "../src/ingest/competitionResolver.js";

describe("competition registry", () => {
  it("has unique ids", () => {
    const ids = COMPETITIONS.map((competition) => competition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // The ingest files an unknown competition under slugify(its raw name), and
  // the registry entry is what "promotes" it. That only works if the entry's
  // id IS that slug: otherwise a match already stored under the stopgap id
  // would stay orphaned. Checked for every competition whose name needs no
  // alias, i.e. whose raw name is its own display name.
  it("registers state championships under the id their raw name slugifies to", () => {
    for (const competition of COMPETITIONS.filter((c) => c.type === "state")) {
      expect(slugify(competition.displayName), competition.displayName).toBe(competition.id);
    }
  });

  it("covers every Brazilian state's championship the registry claims to", () => {
    for (const name of ["Paranaense", "Catarinense", "Goiano", "Paraense", "Potiguar", "Capixaba", "Sul-Mato-Grossense"]) {
      expect(findCompetitionById(`campeonato-${slugify(name)}`), name).toBeDefined();
    }
  });

  // `foreign` is what orders a competition with the European ones. A cup that
  // lacked it would sort ABOVE Série A on a day Arsenal plays the FA Cup.
  it("marks the European national cups foreign, so they sort with the European competitions", () => {
    for (const id of ["fa-cup", "copa-del-rey", "coppa-italia", "coupe-de-france", "dfb-pokal", "efl-cup"]) {
      expect(findCompetitionById(id)?.foreign, id).toBe(true);
    }
  });

  it("does not mark the Brazilian regional cups foreign", () => {
    for (const id of ["copa-do-nordeste", "copa-verde", "copa-centro-oeste"]) {
      expect(findCompetitionById(id)?.foreign, id).toBeUndefined();
    }
  });
});

describe("resolveCompetitionId for the secondary competitions", () => {
  it("maps both the native and the Portuguese name of each national cup to one id", () => {
    expect(resolveCompetitionId("FA Cup")).toBe("fa-cup");
    expect(resolveCompetitionId("Copa da Inglaterra")).toBe("fa-cup");
    expect(resolveCompetitionId("Copa del Rey")).toBe("copa-del-rey");
    expect(resolveCompetitionId("Copa do Rei")).toBe("copa-del-rey");
    expect(resolveCompetitionId("Coppa Italia")).toBe("coppa-italia");
    expect(resolveCompetitionId("Copa da Itália")).toBe("coppa-italia");
    expect(resolveCompetitionId("Coupe de France")).toBe("coupe-de-france");
    expect(resolveCompetitionId("Copa da França")).toBe("coupe-de-france");
  });

  it("files Copa Verde and Copa Centro-Oeste, with or without the hyphen", () => {
    expect(resolveCompetitionId("Copa Verde")).toBe("copa-verde");
    expect(resolveCompetitionId("Copa Centro-Oeste")).toBe("copa-centro-oeste");
    expect(resolveCompetitionId("Copa Centro Oeste")).toBe("copa-centro-oeste");
  });

  // No alias needed: the slug of the raw name already IS the registry id.
  it("recognises a state championship by its name alone", () => {
    expect(resolveCompetitionId("Campeonato Paranaense")).toBe("campeonato-paranaense");
    expect(findCompetitionById(resolveCompetitionId("Campeonato Paranaense"))).toBeDefined();
    expect(findCompetitionById(resolveCompetitionId("Campeonato Sul-Mato-Grossense"))).toBeDefined();
  });

  it("still gives an unknown competition a stopgap id instead of dropping it", () => {
    expect(resolveCompetitionId("Copa Nunca Vista")).toBe("copa-nunca-vista");
  });
});

describe("humanizeCompetitionId", () => {
  it("turns a stopgap id back into a readable name", () => {
    expect(humanizeCompetitionId("campeonato-paranaense")).toBe("Campeonato Paranaense");
    expect(humanizeCompetitionId("copa-verde")).toBe("Copa Verde");
  });

  it("keeps the small words lowercase, but never as the first word", () => {
    expect(humanizeCompetitionId("copa-do-nordeste")).toBe("Copa do Nordeste");
    expect(humanizeCompetitionId("taca-de-portugal")).toBe("Taca de Portugal");
    expect(humanizeCompetitionId("de-volta")).toBe("De Volta");
  });

  it("copes with an empty or oddly hyphenated id without throwing", () => {
    expect(humanizeCompetitionId("")).toBe("");
    expect(humanizeCompetitionId("--copa--x--")).toBe("Copa X");
  });
});
