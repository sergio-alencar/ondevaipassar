import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractChannelNames, parseArticleCandidate } from "../src/sources/tudo-sobre-paulista/article.js";

const florestaItuanoHtml = readFileSync(new URL("./fixtures/tudo-sobre-paulista-floresta-ituano.html", import.meta.url), "utf-8");
const goiasSaoBernardoHtml = readFileSync(new URL("./fixtures/tudo-sobre-paulista-goias-sao-bernardo.html", import.meta.url), "utf-8");

describe("parseArticleCandidate", () => {
  it("parses a real article using the 'Onde assistir {A} x {B}' title shape", () => {
    const url = "https://tudosobrepaulista.com.br/materia/onde-assistir-floresta-x-ituano/";
    expect(parseArticleCandidate(florestaItuanoHtml, url)).toEqual({
      homeTeamNameRaw: "Floresta",
      awayTeamNameRaw: "Ituano",
      dateUtc: "2026-08-29T12:00:00-03:00",
      url,
    });
  });

  it("parses a real article using the '{A} x {B}: onde assistir' title shape (the same Goiás x São Bernardo ESPN gap from earlier this session)", () => {
    const url = "https://tudosobrepaulista.com.br/materia/goias-x-sao-bernardo-onde-assistir-e-escalacoes/";
    expect(parseArticleCandidate(goiasSaoBernardoHtml, url)).toEqual({
      homeTeamNameRaw: "Goiás",
      awayTeamNameRaw: "São Bernardo",
      dateUtc: "2026-08-28T12:00:00-03:00",
      url,
    });
  });

  it("returns null when the title has no 'onde assistir' text at all", () => {
    expect(parseArticleCandidate("<title>Palmeiras anuncia reforço</title>", "https://example.com/x/")).toBeNull();
  });

  it("returns null when the title matches but there's no 'Data:' field", () => {
    expect(parseArticleCandidate("<title>Onde assistir Floresta x Ituano - Tudo Sobre Paulista</title>", "https://example.com/x/")).toBeNull();
  });
});

describe("extractChannelNames", () => {
  it("extracts a channel name out of a link's own text", () => {
    expect(extractChannelNames(florestaItuanoHtml)).toEqual(["SportyNet"]);
  });

  it("extracts multiple plain-text channel names (the Goiás x São Bernardo ESPN + Disney+ pair ge.globo's own agenda page was missing)", () => {
    expect(extractChannelNames(goiasSaoBernardoHtml)).toEqual(["ESPN", "Disney+"]);
  });

  it("returns an empty list when the field isn't present", () => {
    expect(extractChannelNames("<html><body>no onde assistir here</body></html>")).toEqual([]);
  });
});
