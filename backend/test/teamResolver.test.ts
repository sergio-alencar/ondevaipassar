import { describe, expect, it } from "vitest";
import { resolveTeamId } from "../src/ingest/teamResolver.js";

describe("resolveTeamId", () => {
  it("resolves a team's own displayName", () => {
    expect(resolveTeamId("Flamengo")).toBe("flamengo");
    expect(resolveTeamId("Atlético-MG")).toBe("atletico_mineiro");
    expect(resolveTeamId("São Paulo")).toBe("sao_paulo");
  });

  it("is accent- and case-insensitive", () => {
    expect(resolveTeamId("atletico-mg")).toBe("atletico_mineiro");
    expect(resolveTeamId("ATLÉTICO-MG")).toBe("atletico_mineiro");
    expect(resolveTeamId("sao paulo")).toBe("sao_paulo");
    expect(resolveTeamId("SÃO PAULO")).toBe("sao_paulo");
  });

  it("resolves known free-text aliases a source uses instead of our displayName", () => {
    expect(resolveTeamId("RB Bragantino")).toBe("bragantino");
    expect(resolveTeamId("Red Bull Bragantino")).toBe("bragantino");
    expect(resolveTeamId("EC Bahia")).toBe("bahia");
    expect(resolveTeamId("SC Corinthians Paulista")).toBe("corinthians");
    expect(resolveTeamId("Grêmio FBPA")).toBe("gremio");
    expect(resolveTeamId("Sport Club do Recife")).toBe("sport_recife");
    expect(resolveTeamId("Athletic Club")).toBe("athletic");
    expect(resolveTeamId("Athletic-MG")).toBe("athletic");
  });

  it("resolves OneFootball's own verbose domestic team names (real examples, confirmed live)", () => {
    expect(resolveTeamId("Grêmio Novorizontino")).toBe("novorizontino");
    expect(resolveTeamId("São Bernardo FC")).toBe("sao_bernardo");
    expect(resolveTeamId("Athletic Club SJDR MG")).toBe("athletic");
    expect(resolveTeamId("Internacional de Limeira")).toBe("inter_de_limeira");
    expect(resolveTeamId("Barra")).toBe("barra_sc");
  });

  it("returns null for an unrecognized name instead of guessing", () => {
    expect(resolveTeamId("Racing Club de Montevideo")).toBeNull();
    expect(resolveTeamId("")).toBeNull();
    expect(resolveTeamId("Time Que Não Existe")).toBeNull();
  });
});
