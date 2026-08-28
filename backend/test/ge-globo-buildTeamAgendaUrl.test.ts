import { describe, expect, it } from "vitest";
import { buildTeamAgendaUrl, buildTeamHomeUrl } from "../src/sources/ge-globo/client.js";

describe("buildTeamAgendaUrl", () => {
  it("builds the standard path for a big/national club", () => {
    expect(buildTeamAgendaUrl("flamengo")).toBe("https://ge.globo.com/futebol/times/flamengo/agenda-de-jogos-do-flamengo/");
  });

  it("builds the confirmed real path for every team known to need a non-standard, state-prefixed one", () => {
    expect(buildTeamAgendaUrl("mirassol")).toBe("https://ge.globo.com/sp/tem-esporte/futebol/times/mirassol/agenda-de-jogos-do-mirassol/");
    expect(buildTeamAgendaUrl("novorizontino")).toBe("https://ge.globo.com/sp/tem-esporte/futebol/times/novorizontino/agenda-de-jogos-do-novorizontino/");
    expect(buildTeamAgendaUrl("sport")).toBe("https://ge.globo.com/pe/futebol/times/sport/agenda/");
    expect(buildTeamAgendaUrl("cuiaba")).toBe("https://ge.globo.com/mt/futebol/times/cuiaba/agenda/");
    expect(buildTeamAgendaUrl("avai")).toBe("https://ge.globo.com/sc/futebol/times/avai/agenda/");
    expect(buildTeamAgendaUrl("remo")).toBe("https://ge.globo.com/pa/futebol/times/remo/agenda/");
    expect(buildTeamAgendaUrl("londrina")).toBe("https://ge.globo.com/pr/futebol/times/londrina/agenda/");
    expect(buildTeamAgendaUrl("ponte-preta")).toBe("https://ge.globo.com/sp/campinas-e-regiao/futebol/times/ponte-preta/agenda-de-jogos-da-ponte-preta/");
    expect(buildTeamAgendaUrl("athletico-pr")).toBe("https://ge.globo.com/pr/futebol/times/athletico-pr/agenda-de-jogos-do-athletico-pr/");
  });
});

describe("buildTeamHomeUrl", () => {
  it("builds the standard path for a big/national club", () => {
    expect(buildTeamHomeUrl("flamengo")).toBe("https://ge.globo.com/futebol/times/flamengo/");
  });

  it("derives the correct state-prefixed base path for every non-standard team, without a second hardcoded list", () => {
    expect(buildTeamHomeUrl("mirassol")).toBe("https://ge.globo.com/sp/tem-esporte/futebol/times/mirassol/");
    expect(buildTeamHomeUrl("novorizontino")).toBe("https://ge.globo.com/sp/tem-esporte/futebol/times/novorizontino/");
    expect(buildTeamHomeUrl("sport")).toBe("https://ge.globo.com/pe/futebol/times/sport/");
    expect(buildTeamHomeUrl("cuiaba")).toBe("https://ge.globo.com/mt/futebol/times/cuiaba/");
    expect(buildTeamHomeUrl("avai")).toBe("https://ge.globo.com/sc/futebol/times/avai/");
    expect(buildTeamHomeUrl("remo")).toBe("https://ge.globo.com/pa/futebol/times/remo/");
    expect(buildTeamHomeUrl("londrina")).toBe("https://ge.globo.com/pr/futebol/times/londrina/");
    expect(buildTeamHomeUrl("ponte-preta")).toBe("https://ge.globo.com/sp/campinas-e-regiao/futebol/times/ponte-preta/");
    expect(buildTeamHomeUrl("athletico-pr")).toBe("https://ge.globo.com/pr/futebol/times/athletico-pr/");
  });
});
