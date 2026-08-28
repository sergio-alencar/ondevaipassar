import { describe, expect, it } from "vitest";
import { toCanonicalMatch } from "../src/sources/ge-globo-round/adapter.js";
import type { RoundMatch } from "../src/sources/ge-globo-round/schema.js";

function roundMatch(overrides: Partial<RoundMatch> = {}): RoundMatch {
  return {
    id: 349357,
    data_realizacao: "2026-08-28T19:30",
    hora_realizacao: "19:30",
    equipes: {
      mandante: { id: 290, nome_popular: "Goiás", escudo: "https://s.sde.globo.com/goias.svg" },
      visitante: { id: 2880, nome_popular: "São Bernardo", escudo: "https://s.sde.globo.com/sao-bernardo.svg" },
    },
    ...overrides,
  };
}

describe("toCanonicalMatch (ge-globo-round)", () => {
  it("uses the same ge-globo:{id} canonical scheme as the per-team source, for correct cross-source dedup", () => {
    const canonical = toCanonicalMatch(roundMatch(), "brasileirao-serie-b");
    expect(canonical?.id).toBe("ge-globo:349357");
  });

  it("converts the combined local-time string to UTC using the fixed Brasília offset — matches the real value independently verified via the per-team source for this exact match", () => {
    const canonical = toCanonicalMatch(roundMatch(), "brasileirao-serie-b");
    expect(canonical?.kickoffUtc).toBe("2026-08-28T22:30:00.000Z");
    expect(canonical?.kickoffTimeConfirmed).toBe(true);
  });

  it("resolves team names via the shared resolver, including a team only reachable via a free-text alias", () => {
    const canonical = toCanonicalMatch(
      roundMatch({
        equipes: {
          mandante: { id: 343, nome_popular: "Náutico", escudo: "https://s.sde.globo.com/nautico.svg" },
          visitante: { id: 4631, nome_popular: "Athletic Club", escudo: "https://s.sde.globo.com/athletic.svg" },
        },
      }),
      "brasileirao-serie-b",
    );
    expect(canonical?.homeTeamId).toBe("nautico");
    expect(canonical?.awayTeamId).toBe("athletic");
  });

  it("still returns a full match (with a null team id) for an opponent outside our tracked registry, instead of dropping the match", () => {
    const canonical = toCanonicalMatch(
      roundMatch({
        equipes: {
          mandante: { id: 1, nome_popular: "Goiás", escudo: "https://s.sde.globo.com/goias.svg" },
          visitante: { id: 999, nome_popular: "Time Que Não Existe", escudo: "https://s.sde.globo.com/x.svg" },
        },
      }),
      "brasileirao-serie-b",
    );
    expect(canonical).not.toBeNull();
    expect(canonical?.awayTeamId).toBeNull();
    expect(canonical?.awayTeamNameRaw).toBe("Time Que Não Existe");
  });

  it("always returns an empty broadcasts list — this source never carries real channel confirmation", () => {
    expect(toCanonicalMatch(roundMatch(), "brasileirao-serie-b")?.broadcasts).toEqual([]);
  });

  it("uses the competitionId passed in for the hub the match came from", () => {
    expect(toCanonicalMatch(roundMatch(), "brasileirao-serie-a")?.competitionId).toBe("brasileirao-serie-a");
  });
});
