import { describe, expect, it } from "vitest";
import { resolveFemininoTeamId } from "../src/ingest/femininoTeamResolver.js";
import { resolveTeamId } from "../src/ingest/teamResolver.js";

describe("resolveFemininoTeamId", () => {
  it("resolves a bare club name to the dedicated Feminino id, distinct from the men's team of the same name", () => {
    expect(resolveFemininoTeamId("Flamengo")).toBe("flamengo_feminino");
    expect(resolveTeamId("Flamengo")).toBe("flamengo");
    expect(resolveFemininoTeamId("Ferroviária")).toBe("ferroviaria_feminino");
    expect(resolveTeamId("Ferroviária")).toBe("ferroviaria");
  });

  it("strips futnatv's inconsistent trailing 'F'/'Fem'/'Feminino' suffix before matching", () => {
    expect(resolveFemininoTeamId("Flamengo F")).toBe("flamengo_feminino");
    expect(resolveFemininoTeamId("Corinthians (F)")).toBe("corinthians_feminino");
    expect(resolveFemininoTeamId("Palmeiras Feminino")).toBe("palmeiras_feminino");
    expect(resolveFemininoTeamId("Santos Fem")).toBe("santos_feminino");
  });

  it("resolves the one club with no men's counterpart", () => {
    expect(resolveFemininoTeamId("Mixto")).toBe("mixto");
  });

  it("resolves known free-text aliases mirrored from the men's side", () => {
    expect(resolveFemininoTeamId("RB Bragantino")).toBe("bragantino_feminino");
    expect(resolveFemininoTeamId("Atlético-MG")).toBe("atletico_mineiro_feminino");
  });

  it("returns null for an unrecognized name instead of guessing", () => {
    expect(resolveFemininoTeamId("Racing Club de Montevideo")).toBeNull();
    expect(resolveFemininoTeamId("")).toBeNull();
  });
});
