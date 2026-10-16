/**
 * Copies the site's competition logos (frontend/public/images/campeonatos/site)
 * into the Instagram renderer's own assets as small badges for the slides'
 * competition label, named by competition id: competition-badges/<id>.svg|png.
 *
 * Which logo belongs to which competition is read from COMPETITION_LOGOS in
 * frontend/src/lib/assets.ts, so there is one list. Logos the site draws as a
 * flat dark silhouette (`mono: true`) are recoloured the same way here: the
 * site uses the file only as a mask, so any colour in it means "solid".
 *
 *   npx tsx scripts/prepare-competition-badges.ts
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE_LOGOS = join(ROOT, "frontend", "public", "images", "campeonatos", "site");
const OUT = join(ROOT, "backend", "src", "instagram", "assets", "competition-badges");
const DARK = "#1f2937";

const source = readFileSync(join(ROOT, "frontend", "src", "lib", "assets.ts"), "utf-8");
const block = source.slice(source.indexOf("const COMPETITION_LOGOS"), source.indexOf("};", source.indexOf("const COMPETITION_LOGOS")));
const entries = [...block.matchAll(/^\s*"?([a-z0-9-]+)"?:\s*\{\s*file:\s*"([^"]+)"(?:,\s*mono:\s*true)?\s*\}/gm)].map((match) => ({
  id: match[1],
  file: match[2],
  mono: /mono:\s*true/.test(match[0]),
}));

mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(OUT)) rmSync(join(OUT, old));

for (const { id, file, mono } of entries) {
  const extension = file.split(".").pop();
  const target = join(OUT, `${id}.${extension}`);
  if (extension === "svg" && mono) {
    // Every explicit colour becomes the dark grey; "none" stays none, and an SVG with no colours gets one on the root.
    let svg = readFileSync(join(SITE_LOGOS, file), "utf-8").replace(/fill="(?!none)[^"]*"/g, `fill="${DARK}"`).replace(/fill:\s*(?!none)#[0-9a-fA-F]{3,8}/g, `fill:${DARK}`);
    if (!/fill="/.test(svg)) svg = svg.replace("<svg ", `<svg fill="${DARK}" `);
    writeFileSync(target, svg);
  } else {
    copyFileSync(join(SITE_LOGOS, file), target);
  }
}
console.log(`${entries.length} logos de campeonato copiados para ${OUT}`);
