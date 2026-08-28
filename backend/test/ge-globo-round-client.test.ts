import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractListaJogos } from "../src/sources/ge-globo-round/client.js";

const fixtureHtml = readFileSync(new URL("./fixtures/ge-globo-round-serie-b.html", import.meta.url), "utf-8");

describe("extractListaJogos", () => {
  it("extracts the full current round from a real saved competition hub page", () => {
    const matches = extractListaJogos(fixtureHtml);
    expect(matches.length).toBeGreaterThan(5);
    for (const match of matches) {
      expect(typeof match.id).toBe("number");
      expect(typeof match.data_realizacao).toBe("string");
      expect(typeof match.equipes.mandante.nome_popular).toBe("string");
      expect(typeof match.equipes.visitante.nome_popular).toBe("string");
    }
  });

  it("includes a known real match — the actual Novorizontino x Sport gap this source exists to close", () => {
    const matches = extractListaJogos(fixtureHtml);
    const names = matches.map((match) => `${match.equipes.mandante.nome_popular} x ${match.equipes.visitante.nome_popular}`);
    expect(names).toContain("Novorizontino x Sport");
  });

  it("throws a clear error when the marker is missing (page structure changed)", () => {
    expect(() => extractListaJogos("<html><body>no data here</body></html>")).toThrow(/not found/);
  });
});
