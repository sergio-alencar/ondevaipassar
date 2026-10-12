import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPETITIONS, findCompetitionById, isWomensCompetitionName, TEAMS } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { resolveFemininoTeamId } from "../src/ingest/femininoTeamResolver.js";
import { resolveTeamId } from "../src/ingest/teamResolver.js";

const SITE_CRESTS = fileURLToPath(new URL("../../frontend/public/images/times/", import.meta.url));
const INSTAGRAM_CRESTS = fileURLToPath(new URL("../src/instagram/assets/crests/", import.meta.url));

const MEN = TEAMS.filter((team) => team.division === "SELECOES");
const WOMEN = TEAMS.filter((team) => team.division === "SELECOES_FEMININO");
const ALL_MEN = TEAMS.filter((team) => team.division === "SELECOES" || team.division === "SELECOES_OUTRAS");
const ALL_WOMEN = TEAMS.filter((team) => team.division === "SELECOES_FEMININO" || team.division === "SELECOES_FEMININO_OUTRAS");

describe("national teams in the registry", () => {
  it("features 20 men's and 20 women's sides, as Sérgio chose them", () => {
    expect(MEN.length).toBe(20);
    expect(WOMEN.length).toBe(20);
    expect(MEN.map((team) => team.id)).toEqual(expect.arrayContaining(["brasil", "holanda", "estados_unidos", "suica", "noruega", "senegal"]));
    // The women's tab is the FIFA top 20, not the World Cup qualifiers: Argentina and Malawi qualified but are not in it.
    expect(WOMEN.map((team) => team.id)).toEqual(expect.arrayContaining(["espanha_feminino", "brasil_feminino", "islandia_feminino", "colombia_feminino"]));
    expect(WOMEN.map((team) => team.id)).not.toContain("malawi_feminino");
  });

  // So a match against Singapura shows Singapura's crest, not a generic shield.
  it("registers every other country too, in divisions with no tab", () => {
    const others = TEAMS.filter((team) => team.division === "SELECOES_OUTRAS");
    expect(others.length).toBeGreaterThan(150);
    expect(TEAMS.find((team) => team.id === "singapura")?.division).toBe("SELECOES_OUTRAS");
    expect(TEAMS.find((team) => team.id === "singapura_feminino")?.division).toBe("SELECOES_FEMININO_OUTRAS");
  });

  it("names the women's sides like the women's clubs: same id pattern, '(Fem.)' on the display name", () => {
    for (const team of [...WOMEN, ...ALL_WOMEN]) {
      expect(team.id.endsWith("_feminino"), team.id).toBe(true);
      expect(team.displayName.endsWith(" (Fem.)"), team.displayName).toBe(true);
    }
    for (const team of ALL_MEN) expect(team.id.endsWith("_feminino"), team.id).toBe(false);
  });

  // A federation has one crest, whichever of its two sides plays.
  it("gives a country's men's and women's sides the same crest", () => {
    for (const woman of ALL_WOMEN) {
      const man = TEAMS.find((team) => team.id === woman.id.replace(/_feminino$/, ""));
      expect(man, woman.id).toBeDefined();
      expect(woman.crestFile, woman.id).toBe(man!.crestFile);
    }
  });

  it("files every national crest under selecao_<country>", () => {
    for (const team of [...ALL_MEN, ...ALL_WOMEN]) expect(team.crestFile, team.id).toMatch(/^selecao_[a-z_]+\.(svg|png)$/);
  });

  // The site draws every country's crest (an opponent counts); the Instagram renderer only the featured ones.
  it("ships every national crest to the site, and the featured ones to the Instagram renderer too", () => {
    for (const team of [...ALL_MEN, ...ALL_WOMEN]) expect(existsSync(join(SITE_CRESTS, team.crestFile)), `site: ${team.crestFile}`).toBe(true);
    for (const team of [...MEN, ...WOMEN]) expect(existsSync(join(INSTAGRAM_CRESTS, team.crestFile)), `instagram: ${team.crestFile}`).toBe(true);
  });

  it("keeps ids unique across clubs and national teams", () => {
    const ids = TEAMS.map((team) => team.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("national teams and the name resolvers", () => {
  it("resolves a country's name to its national team", () => {
    expect(resolveTeamId("Brasil")).toBe("brasil");
    expect(resolveTeamId("Colômbia")).toBe("colombia");
    // Brazilian football says Holanda; the sources say Países Baixos.
    expect(resolveTeamId("Holanda")).toBe("holanda");
    expect(resolveTeamId("Países Baixos")).toBe("holanda");
  });

  // A country's name is also the start of club names ("Brasil de Pelotas",
  // "Argentinos Juniors", "Universidad de Chile"): only the exact name may map.
  it("does not pull a club whose name merely starts with a country into the national team", () => {
    expect(resolveTeamId("Brasil de Pelotas")).not.toBe("brasil");
    expect(resolveTeamId("Argentinos Juniors")).not.toBe("argentina");
    expect(resolveTeamId("Universidad de Chile")).not.toBe("chile");
  });

  it("keeps the women's CLUB resolver out of the national sides", () => {
    expect(resolveFemininoTeamId("Brasil")).toBeNull();
    expect(resolveFemininoTeamId("Argentina")).toBeNull();
  });
});

describe("national-team competitions", () => {
  it("registers the main ones", () => {
    for (const id of ["copa-do-mundo", "copa-do-mundo-feminina", "eliminatorias-copa-do-mundo", "copa-america", "eurocopa", "liga-das-nacoes-uefa", "amistosos-internacionais"]) {
      expect(findCompetitionById(id), id).toBeDefined();
    }
  });

  it("names the women's ones so the site recognises them as women's football", () => {
    for (const competition of COMPETITIONS.filter((c) => c.id.endsWith("-feminina") || c.id.endsWith("-femininos"))) {
      expect(isWomensCompetitionName(competition.displayName), competition.displayName).toBe(true);
    }
  });
});
