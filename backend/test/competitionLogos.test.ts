import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findCompetitionById } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";

// The site's logo map lives in frontend/src/lib/assets.ts, which can't be
// imported here (it reads import.meta.env). It is parsed instead: this is a
// check on the one place a typo turns into a broken image with no error.
const ASSETS_TS = readFileSync(fileURLToPath(new URL("../../frontend/src/lib/assets.ts", import.meta.url)), "utf-8");
const SITE_DIR = fileURLToPath(new URL("../../frontend/public/images/campeonatos/site/", import.meta.url));

const block = ASSETS_TS.slice(ASSETS_TS.indexOf("const COMPETITION_LOGOS"), ASSETS_TS.indexOf("/** A competition's symbol-only logo"));
const entries = [...block.matchAll(/^\s+(?:"([^"]+)"|([a-z0-9]+)): \{ file: "([^"]+)"(, mono: true)? \},$/gm)].map((m) => ({
  id: m[1] ?? m[2],
  file: m[3],
  mono: m[4] !== undefined,
}));

describe("competition logo map", () => {
  it("parses a plausible number of entries (so this test can't pass by finding none)", () => {
    expect(entries.length).toBeGreaterThanOrEqual(19);
  });

  it("only names competitions that exist in the registry", () => {
    for (const entry of entries) expect(findCompetitionById(entry.id), entry.id).toBeDefined();
  });

  it("only names files that exist", () => {
    for (const entry of entries) expect(existsSync(SITE_DIR + entry.file), `${entry.id} -> ${entry.file}`).toBe(true);
  });

  it("has no competition twice", () => {
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  });

  // The Bundesliga's red rectangle is opaque, so as a mask it is a solid block.
  // Mono is only for artwork whose shape survives as a silhouette.
  it("does not flatten the logos that would turn into a block", () => {
    for (const id of ["bundesliga", "sul-americana", "serie-a-italiana", "copa-do-brasil"]) {
      expect(entries.find((e) => e.id === id)?.mono, id).toBe(false);
    }
  });

  it("flattens the Brasileirão family, whose yellow vanishes on a white card", () => {
    for (const id of ["brasileirao-serie-a", "brasileirao-feminino"]) {
      expect(entries.find((e) => e.id === id)?.mono, id).toBe(true);
    }
  });

  // Série B and C are pre-recoloured instead (dark body, white ball): a mask
  // would flatten the ball into the body.
  it("keeps Série B and C dark with a white ball, without yellow", () => {
    for (const id of ["brasileirao-serie-b", "brasileirao-serie-c"]) {
      const entry = entries.find((e) => e.id === id);
      expect(entry?.mono, id).toBe(false);
      const svg = readFileSync(join(SITE_DIR, entry!.file), "utf-8");
      expect(svg, id).toContain("#1E2939");
      expect(svg, id).toContain("#FFFFFF");
      expect(svg, id).not.toMatch(/#FFF419|#FEF400/i);
    }
  });

  // A file nobody maps is art that never reaches the site, usually because the
  // entry was forgotten.
  it("leaves no logo file in site/ that the map doesn't use", () => {
    const used = new Set(entries.map((e) => e.file));
    for (const file of readdirSync(SITE_DIR).filter((f) => !f.startsWith("."))) expect(used.has(file), file).toBe(true);
  });
});
