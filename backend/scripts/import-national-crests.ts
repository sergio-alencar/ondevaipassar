/**
 * Turns the federation crests downloaded from football-logos.cc into the
 * site's crest files, once, for every national team.
 *
 *   1. Put the SVGs in frontend/assets-src/selecoes/ under any name that
 *      contains the country's English name as football-logos.cc writes it
 *      ("brazil-national-team.svg", "portuguese-football-federation.svg"…).
 *   2. npx tsx scripts/import-national-crests.ts
 *
 * Each is cropped to its visible area and written as selecao_<id>.svg to BOTH
 * crest folders (the site's and the Instagram renderer's), then reported. A
 * country with no file is listed, not skipped silently.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cropSvg } from "./cropSvg.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
// Outside public/: the whole library (every country) is kept for later, but only the crests a team uses are published.
const SOURCE_DIR = join(ROOT, "frontend", "assets-src", "selecoes");
const SITE_CRESTS = join(ROOT, "frontend", "public", "images", "times");
const INSTAGRAM_CRESTS = join(ROOT, "backend", "src", "instagram", "assets", "crests");

/** Team id -> words that identify its file by name (all must be present, lowercase). Portugal and the Netherlands are named after their federation on football-logos.cc. */
const MATCH: Record<string, string[]> = {
  brasil: ["brazil"], argentina: ["argentina"], uruguai: ["uruguay"], colombia: ["colombia"], equador: ["ecuador"], paraguai: ["paraguay"],
  chile: ["chile"], peru: ["peru"], venezuela: ["venezuela"], bolivia: ["bolivia"], portugal: ["portug"], espanha: ["spain"], franca: ["france"],
  inglaterra: ["england"], alemanha: ["germany"], italia: ["italy"], paises_baixos: ["dutch", "netherlands"], belgica: ["belgium"],
  croacia: ["croatia"], dinamarca: ["denmark"], mexico: ["mexico"], estados_unidos: ["usa", "united-states", "us-soccer"], japao: ["japan"],
  marrocos: ["morocco"], australia: ["australia"], china: ["china"], coreia_do_sul: ["south-korea", "korea-republic"], filipinas: ["philippines"],
  coreia_do_norte: ["north-korea", "korea-dpr"], nova_zelandia: ["new-zealand"], argelia: ["algeria"], camaroes: ["cameroon"], malawi: ["malawi"],
};

/** No SVG exists for these (only a PNG, trimmed by hand into selecao_<id>.png in both crest folders): the registry points at the PNG, so this script leaves them alone. */
const PNG_ONLY = new Set(["argelia", "camaroes", "malawi"]);

const files = existsSync(SOURCE_DIR) ? readdirSync(SOURCE_DIR).filter((name) => name.toLowerCase().endsWith(".svg")) : [];
if (files.length === 0) throw new Error(`no SVG in ${SOURCE_DIR}`);
mkdirSync(SITE_CRESTS, { recursive: true });

const missing: string[] = [];
for (const [id, words] of Object.entries(MATCH)) {
  if (PNG_ONLY.has(id)) continue;
  // "south-korea" must not be taken for "north-korea": the longest matching word wins ties by listing the specific words first.
  const file = files.find((name) => words.some((word) => name.toLowerCase().includes(word)) && !(id === "coreia_do_sul" && name.includes("north")) && !(id === "coreia_do_norte" && name.includes("south")));
  if (!file) { missing.push(id); continue; }
  const { svg, from, to } = cropSvg(readFileSync(join(SOURCE_DIR, file), "utf-8"));
  const target = `selecao_${id}.svg`;
  writeFileSync(join(SITE_CRESTS, target), svg, "utf-8");
  copyFileSync(join(SITE_CRESTS, target), join(INSTAGRAM_CRESTS, target));
  console.log(`${id.padEnd(16)} <- ${file}  (${from[0].toFixed(0)}x${from[1].toFixed(0)} -> ${to[0].toFixed(0)}x${to[1].toFixed(0)})`);
}
console.log(missing.length ? `\nSem arquivo: ${missing.join(", ")}` : "\nTodas as 33 seleções têm escudo.");
