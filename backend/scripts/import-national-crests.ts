/**
 * Turns the federation crests downloaded from football-logos.cc into the
 * site's crest files, once, for every national team.
 *
 *   1. Put the SVG in frontend/assets-src/selecoes/ named after the team's id
 *      ("brasil.svg", "holanda.svg", "estados_unidos.svg").
 *   2. npx tsx scripts/import-national-crests.ts
 *
 * Each is cropped to its visible area and written as selecao_<id>.svg to BOTH
 * crest folders (the site's and the Instagram renderer's), then reported. A
 * country with no file is listed, not skipped silently.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TEAMS } from "@ondevaipassar/shared";
import { cropSvg } from "./cropSvg.js";

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
/** No SVG exists for these (only a PNG, trimmed by hand into selecao_<id>.png in both crest folders): the registry points at the PNG, so this script leaves them alone. */
const PNG_ONLY = new Set(["argelia", "camaroes", "malawi"]);

if (!existsSync(SOURCE_DIR)) throw new Error(`no folder ${SOURCE_DIR}`);
mkdirSync(SITE_CRESTS, { recursive: true });

const missing: string[] = [];
const countries = new Set(TEAMS.filter((team) => team.division === "SELECOES" || team.division === "SELECOES_FEMININO").map((team) => team.id.replace(/_feminino$/, "")));
for (const id of [...countries].sort()) {
  if (PNG_ONLY.has(id)) continue;
  const file = join(SOURCE_DIR, `${id}.svg`);
  if (!existsSync(file)) { missing.push(id); continue; }
  const { svg, from, to } = cropSvg(readFileSync(file, "utf-8"));
  const target = `selecao_${id}.svg`;
  writeFileSync(join(SITE_CRESTS, target), svg, "utf-8");
  copyFileSync(join(SITE_CRESTS, target), join(INSTAGRAM_CRESTS, target));
  console.log(`${id.padEnd(16)} <- ${id}.svg  (${from[0].toFixed(0)}x${from[1].toFixed(0)} -> ${to[0].toFixed(0)}x${to[1].toFixed(0)})`);
}
console.log(missing.length ? `\nSem arquivo: ${missing.join(", ")}` : `\nTodas as ${countries.size} seleções têm escudo.`);
