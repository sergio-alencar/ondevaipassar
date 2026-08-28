import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractChannelNames, parseArticleCandidate } from "../src/sources/futebol-interior/article.js";

const previewHtml = readFileSync(new URL("./fixtures/futebol-interior-floresta-ituano.html", import.meta.url), "utf-8");
const recapHtml = readFileSync(new URL("./fixtures/futebol-interior-guarani-brusque-recap.html", import.meta.url), "utf-8");

describe("parseArticleCandidate", () => {
  it("parses a real preview article into a candidate", () => {
    const url = "https://www.futebolinterior.com.br/floresta-ituano-serie-c/";
    expect(parseArticleCandidate(previewHtml, url)).toEqual({
      homeTeamNameRaw: "Floresta-CE",
      awayTeamNameRaw: "Ituano",
      dateUtc: "2026-08-28T15:37:15-03:00",
      url,
    });
  });

  it("returns null for a post-match recap (same '-serie-c' url shape, no 'onde assistir' in the title)", () => {
    expect(parseArticleCandidate(recapHtml, "https://www.futebolinterior.com.br/guarani-brusque-serie-c/")).toBeNull();
  });

  it("returns null when there's no title at all", () => {
    expect(parseArticleCandidate("<html><body>no title here</body></html>", "https://example.com/x/")).toBeNull();
  });
});

describe("extractChannelNames", () => {
  it("extracts the channel from a real article's 'Onde assistir' field", () => {
    expect(extractChannelNames(previewHtml)).toEqual(["SportyNet"]);
  });

  it("returns an empty list when the field isn't present", () => {
    expect(extractChannelNames(recapHtml)).toEqual([]);
  });
});
