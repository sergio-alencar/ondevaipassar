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

  it("parses N Sports' '🔴 AO VIVO E COM IMAGENS I A X B I ...' format, where 'AO VIVO' sits before the team names, separated by the letter 'I' (not a pipe)", () => {
    expect(parseMatchTitle("🔴 AO VIVO E COM IMAGENS I BAHIA X PALMEIRAS I QUARTAS DE FINAL I BRASILEIRÃO FEMININO 2026")).toEqual({
      homeTeamNameRaw: "BAHIA",
      awayTeamNameRaw: "PALMEIRAS",
    });
    expect(parseMatchTitle("🔴 AO VIVO E COM IMAGENS I ACADÉMICO VISEU X PORTO I LIGA PORTUGAL 2026/27")).toEqual({
      homeTeamNameRaw: "ACADÉMICO VISEU",
      awayTeamNameRaw: "PORTO",
    });
  });

  it("returns null for non-match content (interviews, other sports formats)", () => {
    expect(parseMatchTitle("AO VIVO: SPATEN FIGHT NIGHT 3 | LUTA | ge tv")).toBeNull();
    expect(parseMatchTitle("AO VIVO! UBUNTU RECEBE A EX-JUDOCA EDINANCI FERNANDES DA SILVA | ge.globo")).toBeNull();
  });

  // Real incident (2026-09-05): both of these were attached as ge TV
  // broadcasts of matches that only aired on Premiere. A pre-game show is
  // genuinely live and carries the team pair in the exact shape a real
  // broadcast title uses — the giveaway is PRÉ-JOGO, and the last segment
  // naming the actual broadcaster.
  it("returns null for pre/post-game studio shows, which carry the team pair in the same shape as a real broadcast", () => {
    expect(parseMatchTitle("AO VIVO: SÃO PAULO X ATLÉTICO MG | BRASILERÃO 2026 | PRÉ-JOGO | Premiere")).toBeNull();
    expect(parseMatchTitle("AO VIVO: FLAMENGO X MIRASSOL | BRASILERÃO 2026 | PRÉ-JOGO | Premiere")).toBeNull();
    expect(parseMatchTitle("FLAMENGO X BOTAFOGO | PÓS-JOGO | BRASILEIRÃO 2026")).toBeNull();
    // accent- and separator-insensitive
    expect(parseMatchTitle("AO VIVO: GRÊMIO X INTER | PRE JOGO | Premiere")).toBeNull();
  });

  // The other side of that fix: these are real ge TV broadcasts pulled from
  // the channel's own live listing the same day, and must keep matching.
  it("still parses real ge TV broadcasts", () => {
    expect(parseMatchTitle("AO VIVO: FERROVIÁRIA X FLAMENGO | QUARTAS DE FINAL | BRASILEIRÃO FEMININO 2026 | ge tv")).toEqual({
      homeTeamNameRaw: "FERROVIÁRIA",
      awayTeamNameRaw: "FLAMENGO",
    });
    expect(parseMatchTitle("REMO X FLAMENGO | AO VIVO E COM IMAGENS | BRASILEIRÃO 2026 | ge tv")).toEqual({
      homeTeamNameRaw: "REMO",
      awayTeamNameRaw: "FLAMENGO",
    });
  });

  // ge tv renames a stream to "JOGO COMPLETO:" once the match is over, and
  // that renamed VOD matches no pattern (none of them accept that prefix) —
  // correct, since only upcoming/live streams should ever attach. Pinned
  // here because the rename is invisible from our side: the broadcast row
  // was created while the title still said "AO VIVO:", so finding this
  // title on an attached row is expected, not evidence of a bad match.
  it("does not match a post-match 'JOGO COMPLETO' VOD rename", () => {
    expect(parseMatchTitle("JOGO COMPLETO: SANTOS X PALMEIRAS | QUARTAS DE FINAL | COPA DO BRASIL 2026 | ge tv")).toBeNull();
  });
});
