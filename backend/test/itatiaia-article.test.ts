import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractChannelNames, parseArticleCandidate } from "../src/sources/itatiaia/article.js";

const dortmundHtml = readFileSync(new URL("./fixtures/itatiaia-dortmund-hamburgo.html", import.meta.url), "utf-8");
const leipzigHtml = readFileSync(new URL("./fixtures/itatiaia-leipzig-monchengladbach.html", import.meta.url), "utf-8");
const recapHtml = readFileSync(new URL("./fixtures/itatiaia-bayern-recap.html", import.meta.url), "utf-8");

describe("parseArticleCandidate", () => {
  it("parses a real preview article, deriving the match date from datePublished + the day mentioned in prose", () => {
    const url = "https://www.itatiaia.com.br/esportes/futebol/futebol-internacional/futebol-alemao/horario-e-onde-assistir-ao-vivo-borussia-dortmund-x-hamburgo-pela-bundesliga/";
    // Published 2026-08-27, prose says "neste sábado (29)" -> 2026-08-29.
    expect(parseArticleCandidate(dortmundHtml, url)).toEqual({
      homeTeamNameRaw: "Borussia Dortmund",
      awayTeamNameRaw: "Hamburgo",
      dateUtc: "2026-08-29T12:00:00-03:00",
      url,
    });
  });

  it("accepts the '... : onde assistir ao jogo' title-line variant too (not just '... : onde assistir')", () => {
    const url = "https://www.itatiaia.com.br/esportes/futebol/futebol-internacional/futebol-alemao/horario-e-onde-assistir-ao-vivo-rb-leipzig-x-monchengladbach-pela-bundesliga/";
    expect(parseArticleCandidate(leipzigHtml, url)).toEqual({
      homeTeamNameRaw: "RB Leipzig",
      awayTeamNameRaw: "Monchengladbach",
      dateUtc: "2026-08-29T12:00:00-03:00",
      url,
    });
  });

  it("returns null for a post-match recap (no 'onde assistir' line in its articleBody)", () => {
    expect(parseArticleCandidate(recapHtml, "https://example.com/x/")).toBeNull();
  });

  it("returns null when there's no JSON-LD script at all", () => {
    expect(parseArticleCandidate("<html><body>no schema here</body></html>", "https://example.com/x/")).toBeNull();
  });
});

describe("extractChannelNames", () => {
  it("extracts both Streaming and YouTube fields regardless of which comes first", () => {
    // Real order: Streaming then YouTube.
    expect(extractChannelNames(dortmundHtml)).toEqual(["Prime Vídeo", "Cazé TV", "SportyNet"]);
  });

  it("extracts both fields even when YouTube comes first and is lowercase-y ('Youtube:')", () => {
    // Real order in this fixture: YouTube then Streaming.
    const names = extractChannelNames(leipzigHtml);
    expect(names).toContain("Canal GOAT");
    expect(names.some((n) => n.toLowerCase().includes("onefo"))).toBe(true);
  });

  it("returns an empty list when neither field is present", () => {
    expect(extractChannelNames(recapHtml)).toEqual([]);
  });
});
