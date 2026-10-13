/**
 * Turns the federation crests downloaded from football-logos.cc into the
 * site's crest files, once, for every national team.
 *
 *   1. Put the SVG in frontend/assets-src/selecoes/ named after the team's id
 *      ("brasil.svg", "holanda.svg", "estados_unidos.svg").
 *   2. npx tsx scripts/import-national-crests.ts
 *
 * Each loses its title stars (removeStars.ts), then is cropped to its visible area and written as selecao_<id>.svg to the
 * site's crest folder and to the Instagram renderer's too (an opponent can be any country). A country with no file is listed, not skipped
 * silently.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { NATIONAL_TEAMS, PNG_CRESTS, TEAMS } from "@ondevaipassar/shared";
import { cropSvg } from "./cropSvg.js";
import { removeStars } from "./removeStars.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
// Outside public/: the whole library (every country) is kept for later, but only the crests a team uses are published.
const SOURCE_DIR = join(ROOT, "frontend", "assets-src", "selecoes");
const SITE_CRESTS = join(ROOT, "frontend", "public", "images", "times");
const INSTAGRAM_CRESTS = join(ROOT, "backend", "src", "instagram", "assets", "crests");

/**
 * Files in the library are named after the team's id (the registry's, in
 * Portuguese: brasil.svg, holanda.svg, estados_unidos.svg), so every national
 * team finds its own crest with no mapping table.
 */
/** No SVG exists for these, only a PNG trimmed by hand into selecao_<id>.png in both crest folders: this script leaves them alone. */
const HAND_MADE_PNG = new Set(["argelia", "camaroes", "malawi"]);

/** An SVG above this many bytes becomes a PNG at the size the site draws it (100-130px, so 384 covers a 3x screen). */
const HEAVY_SVG_BYTES = 400_000;
const PNG_HEIGHT = 384;

if (!existsSync(SOURCE_DIR)) throw new Error(`no folder ${SOURCE_DIR}`);
mkdirSync(SITE_CRESTS, { recursive: true });

/**
 * Crests whose floating stars are part of the drawing, not title stars: the
 * star over Sudan's emblem, the one in Djibouti's. Everything else loses them.
 */
const KEEP_STARS = new Set(["sudao", "djibuti"]);

const missing: string[] = [];
const withoutStars: string[] = [];
const madePng: string[] = [];
const countries = [...new Set(NATIONAL_TEAMS.map((team) => team.id.replace(/_feminino$/, "")))].sort();
let written = 0;
for (const id of countries) {
  if (HAND_MADE_PNG.has(id)) continue;
  const file = join(SOURCE_DIR, `${id}.svg`);
  if (!existsSync(file)) { missing.push(id); continue; }
  const source = readFileSync(file, "utf-8");
  // Stars first, so the crop below measures the crest without them.
  const stripped = KEEP_STARS.has(id) ? { svg: source, removed: 0 } : removeStars(source);
  if (stripped.removed > 0) withoutStars.push(`${id} (${stripped.removed})`);
  const { svg } = cropSvg(stripped.svg);
  const heavy = svg.length > HEAVY_SVG_BYTES;
  if (heavy) madePng.push(id);
  const target = `selecao_${id}.${heavy ? "png" : "svg"}`;
  if (heavy) {
    writeFileSync(join(SITE_CRESTS, target), new Resvg(svg, { fitTo: { mode: "height", value: PNG_HEIGHT } }).render().asPng());
    rmSync(join(SITE_CRESTS, `selecao_${id}.svg`), { force: true });
  } else {
    writeFileSync(join(SITE_CRESTS, target), svg, "utf-8");
    rmSync(join(SITE_CRESTS, `selecao_${id}.png`), { force: true });
  }
  // Every country, not only the featured ones: a featured side's opponent (Lituânia, Grécia) is any country, and a missing file prints the gray shield on the post.
  rmSync(join(INSTAGRAM_CRESTS, `selecao_${id}.${heavy ? "svg" : "png"}`), { force: true });
  copyFileSync(join(SITE_CRESTS, target), join(INSTAGRAM_CRESTS, target));
  written += 1;
}
console.log(`${written} escudos gravados em ${SITE_CRESTS}`);
if (withoutStars.length) console.log(`Estrelas de título retiradas de: ${withoutStars.join(", ")}`);
const expectedPng = [...PNG_CRESTS].filter((id) => !HAND_MADE_PNG.has(id)).sort();
if (madePng.sort().join() !== expectedPng.join()) {
  console.error(`\nPNG_CRESTS (packages/shared/src/nationalTeams.ts) não bate com o que foi gerado.\nGerados como PNG: ${madePng.join(", ") || "nenhum"}\nNa lista: ${expectedPng.join(", ") || "nenhum"}`);
  process.exitCode = 1;
}
console.log(madePng.length ? `Escudos pesados convertidos em PNG: ${madePng.join(", ")}` : "Nenhum escudo pesado.");
console.log(missing.length ? `\nSem arquivo (ficam com o escudo genérico): ${missing.join(", ")}` : `\nTodas as ${countries.length} seleções têm escudo.`);
