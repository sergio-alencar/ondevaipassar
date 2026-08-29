import { describe, expect, it } from "vitest";
import { parseMatchTitle } from "../src/sources/youtube/schema.js";

describe("parseMatchTitle", () => {
  it("parses ge tv / CazéTV's 'AO VIVO: A X B |' format", () => {
    expect(parseMatchTitle("AO VIVO: BOTAFOGO X PALMEIRAS | BRASILEIRÃO 2026 | 26ª RODADA")).toEqual({
      homeTeamNameRaw: "BOTAFOGO",
      awayTeamNameRaw: "PALMEIRAS",
    });
    expect(parseMatchTitle("AO VIVO: PALMEIRAS X SANTOS | QUARTAS DE FINAL | COPA DO BRASIL 2026 | ge tv")).toEqual({
      homeTeamNameRaw: "PALMEIRAS",
      awayTeamNameRaw: "SANTOS",
    });
  });

  it("parses SportyNet's 'A X B: AO VIVO' format, including a stray space before the colon", () => {
    expect(parseMatchTitle("ITABAIANA X BOTAFOGO-PB: AO VIVO, COM IMAGENS E EXCLUSIVO | RODADA 19 | BRASILEIRÃO SÉRIE C")).toEqual({
      homeTeamNameRaw: "ITABAIANA",
      awayTeamNameRaw: "BOTAFOGO-PB",
    });
    expect(parseMatchTitle("AMÉRICA-MG X PONTE PRETA : AO VIVO E COM IMAGENS | RODADA 25 | BRASILEIRÃO SÉRIE B")).toEqual({
      homeTeamNameRaw: "AMÉRICA-MG",
      awayTeamNameRaw: "PONTE PRETA",
    });
  });

  it("parses Canal GOAT / ge tv's 'A X B | AO VIVO' format", () => {
    expect(parseMatchTitle("CRB X CRICIÚMA | AO VIVO E COM IMAGENS | BRASILEIRÃO SÉRIE B")).toEqual({
      homeTeamNameRaw: "CRB",
      awayTeamNameRaw: "CRICIÚMA",
    });
    expect(parseMatchTitle("FLAMENGO X BOTAFOGO | AO VIVO E COM IMAGENS | BRASILEIRÃO 2026 | ge tv")).toEqual({
      homeTeamNameRaw: "FLAMENGO",
      awayTeamNameRaw: "BOTAFOGO",
    });
  });

  it("parses FPF TV's '{competition} | A X B | {round}, AO VIVO...' format, where AO VIVO sits in a later segment, not right after the team names", () => {
    expect(parseMatchTitle("COPA PARANÁ 2026 | ATHLETICO X PARANÁ CLUBE | RODADA 1, AO VIVO E DE GRAÇA!")).toEqual({
      homeTeamNameRaw: "ATHLETICO",
      awayTeamNameRaw: "PARANÁ CLUBE",
    });
    expect(parseMatchTitle("COPA PARANÁ 2026 | LONDRINA X PARANAVAÍ | RODADA 1, AO VIVO E DE GRAÇA!")).toEqual({
      homeTeamNameRaw: "LONDRINA",
      awayTeamNameRaw: "PARANAVAÍ",
    });
  });

  it("returns null for non-match content (interviews, other sports formats)", () => {
    expect(parseMatchTitle("AO VIVO: SPATEN FIGHT NIGHT 3 | LUTA | ge tv")).toBeNull();
    expect(parseMatchTitle("AO VIVO! UBUNTU RECEBE A EX-JUDOCA EDINANCI FERNANDES DA SILVA | ge.globo")).toBeNull();
  });
});
