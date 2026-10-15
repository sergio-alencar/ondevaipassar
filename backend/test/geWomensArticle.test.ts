import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isWomensPreviewCandidate, kickoffFrom, parseTitleTeams, parseWomensArticle, resolveGameDate } from "../src/sources/ge-globo/womensArticle.js";

const fixture = (name: string): string => readFileSync(new URL(`./fixtures/ge-feminino-${name}.html`, import.meta.url), "utf-8");
const FERROVIARIA_URL =
  "https://ge.globo.com/sp/ribeirao-preto-e-regiao/futebol/futebol-feminino/copa-do-brasil-feminina/noticia/2026/10/12/ferroviaria-x-bragantino-na-copa-do-brasil-feminina-onde-assistir-ao-vivo-e-horario.ghtml";
const BRASIL_URL = "https://ge.globo.com/futebol/selecao-brasileira/noticia/2026/10/13/brasil-x-argentina-veja-onde-assistir-escalacoes-e-horario-do-amistoso-da-selecao-feminina.ghtml";

describe("parseWomensArticle (real ge.globo articles)", () => {
  it("reads Ferroviária x Bragantino: Monday 12/10 at 18h, three channels named", () => {
    const game = parseWomensArticle(fixture("ferroviaria-bragantino"), FERROVIARIA_URL);
    expect(game).toMatchObject({ homeTeamNameRaw: "Ferroviária", awayTeamNameRaw: "Bragantino", kickoffUtc: "2026-10-12T21:00:00.000Z" });
    expect(game?.competitionName).toBe("Copa do Brasil Feminina");
    expect(game?.channelIds).toEqual(expect.arrayContaining(["sportv"]));
  });

  it("reads Brasil x Argentina: Tuesday 13/10 at 20h30, SporTV and getv", () => {
    const game = parseWomensArticle(fixture("brasil-argentina"), BRASIL_URL);
    expect(game).toMatchObject({ homeTeamNameRaw: "Brasil", awayTeamNameRaw: "Argentina", kickoffUtc: "2026-10-13T23:30:00.000Z" });
    expect(game?.channelIds).toEqual(expect.arrayContaining(["sportv", "getv"]));
  });

  it("gives up rather than guess when there is no time", () => {
    expect(parseWomensArticle("<h1>A x B: onde assistir</h1><div data-block-type=\"unstyled\"><p>Sem horário.</p></div>", BRASIL_URL)).toBeNull();
  });
});

describe("pieces", () => {
  it("takes the away side up to where the competition starts", () => {
    expect(parseTitleTeams("Vasco da Gama x Corinthians na Copa do Brasil Feminina: onde assistir")).toEqual({ home: "Vasco da Gama", away: "Corinthians" });
    expect(parseTitleTeams("Brasil x Argentina: onde assistir")).toEqual({ home: "Brasil", away: "Argentina" });
    expect(parseTitleTeams("Sem times: onde assistir")).toBeNull();
  });

  it("resolves 'nesta segunda' to the first Monday on or after publication", () => {
    expect(resolveGameDate("nesta segunda-feira", "2026-10-12")).toBe("2026-10-12");
    expect(resolveGameDate("neste sábado", "2026-10-12")).toBe("2026-10-17");
    expect(resolveGameDate("hoje", "2026-10-12")).toBe("2026-10-12");
    expect(resolveGameDate("amanhã", "2026-10-12")).toBe("2026-10-13");
    expect(resolveGameDate("em breve", "2026-10-12")).toBeNull();
  });

  it("turns a Brasília time into UTC", () => expect(kickoffFrom("2026-10-13", "20", "30")).toBe("2026-10-13T23:30:00.000Z"));

  it("only fetches women's previews", () => {
    expect(isWomensPreviewCandidate({ title: "A x B: onde assistir", url: "https://ge.globo.com/sp/futebol/futebol-feminino/copa/noticia/2026/10/12/a.ghtml" })).toBe(true);
    expect(isWomensPreviewCandidate({ title: "A x B: onde assistir", url: "https://ge.globo.com/futebol/times/a/noticia/2026/10/12/a.ghtml" })).toBe(false);
  });
});

describe("the Corinthians x Colo-Colo article (a bolded start in the Transmissão line)", () => {
  const url = "https://ge.globo.com/sp/campinas-e-regiao/futebol/futebol-feminino/libertadores-feminina/noticia/2026/10/15/corinthians-x-colo-colo-pela-libertadores-feminina-onde-assistir-ao-vivo-e-horario.ghtml";

  it("reads every channel, not none", () => {
    const game = parseWomensArticle(fixture("corinthians-colo-colo"), url);
    expect(game?.kickoffUtc).toBe("2026-10-15T20:00:00.000Z");
    expect(game?.channelIds).toEqual(expect.arrayContaining(["sportv", "nsports", "cazetv", "xsports", "uol", "meutimao", "golbrasil", "pluto"]));
    expect(game?.channelIds).not.toContain("goat");
  });
});
