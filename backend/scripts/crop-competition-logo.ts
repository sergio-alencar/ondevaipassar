/**
 * Crops a competition's SVG art for the site (frontend/public/images/campeonatos/site/).
 *
 *   npx tsx scripts/crop-competition-logo.ts <input.svg> <output.svg> [viewBox]
 *
 * PNG/WebP art is not handled here — it only needs its transparent margin
 * trimmed (see how site/*.png were made). The cropping itself is cropSvg.ts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { cropSvg } from "./cropSvg.js";

const [input, output, viewBoxOverride] = process.argv.slice(2);
if (!input || !output) throw new Error("usage: crop-competition-logo.ts <input.svg> <output.svg> [viewBox]");

const { svg, from, to } = cropSvg(readFileSync(input, "utf-8"), viewBoxOverride);
writeFileSync(output, svg, "utf-8");
console.log(`${input.split("/").pop()}: ${from[0].toFixed(0)}x${from[1].toFixed(0)} -> ${to[0].toFixed(0)}x${to[1].toFixed(0)}`);
