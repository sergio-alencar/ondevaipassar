import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractConfirmedChannelNames, parseArticleCandidate } from "../src/sources/ge-globo/ondeAssistirArticle.js";

const goiasArticleHtml = readFileSync(
  new URL("./fixtures/ge-globo-onde-assistir-goias-sao-bernardo.html", import.meta.url),
  "utf-8",
);
const nauticoArticleHtml = readFileSync(
  new URL("./fixtures/ge-globo-onde-assistir-nautico-athletic.html", import.meta.url),
  "utf-8",
);

function item(title: string, url: string) {
  return { content: { title, url } };
}

describe("parseArticleCandidate", () => {
  it("parses a real preview article title/url into a candidate", () => {
    const candidate = parseArticleCandidate(
      item(
        "Náutico x Athletic-MG: onde assistir ao vivo, horário e escalações",
        "https://ge.globo.com/pe/futebol/brasileirao-serie-b/noticia/2026/08/28/nautico-x-athletic-mg-onde-assistir-ao-vivo-horario-e-escalacoes.ghtml",
      ),
    );
    expect(candidate).toEqual({
      homeTeamNameRaw: "Náutico",
      awayTeamNameRaw: "Athletic-MG",
      dateUtc: "2026-08-28T12:00:00Z",
      url: "https://ge.globo.com/pe/futebol/brasileirao-serie-b/noticia/2026/08/28/nautico-x-athletic-mg-onde-assistir-ao-vivo-horario-e-escalacoes.ghtml",
    });
  });

  it("returns null for a feed item that isn't one of these previews (most of a team's feed)", () => {
    expect(parseArticleCandidate(item("Goiás vence clássico e assume liderança", "https://ge.globo.com/go/futebol/noticia/2026/08/20/goias-vence.ghtml"))).toBeNull();
  });

  it("returns null when the title matches but has no ' x ' team separator", () => {
    expect(parseArticleCandidate(item("Onde assistir: onde assistir ao vivo, horário e escalações", "https://ge.globo.com/x/noticia/2026/08/20/a.ghtml"))).toBeNull();
  });

  it("returns null when the url has no /noticia/YYYY/MM/DD/ dateline", () => {
    expect(
      parseArticleCandidate(item("Náutico x Athletic-MG: onde assistir ao vivo, horário e escalações", "https://ge.globo.com/pe/futebol/jogo/nautico-athletic.ghtml")),
    ).toBeNull();
  });
});

describe("extractConfirmedChannelNames", () => {
  it("extracts channels from a real article that ge.globo's agenda-page JSON didn't list (the Goiás x São Bernardo ESPN gap)", () => {
    expect(extractConfirmedChannelNames(goiasArticleHtml)).toEqual(["ESPN", "Disney+"]);
  });

  it("extracts channels from a real article, trimming a trailing period", () => {
    expect(extractConfirmedChannelNames(nauticoArticleHtml)).toEqual(["Premiere", "Sportv"]);
  });

  it("returns an empty list when the Transmissão bullet isn't present", () => {
    expect(extractConfirmedChannelNames("<html><body>no transmissão here</body></html>")).toEqual([]);
  });
});
