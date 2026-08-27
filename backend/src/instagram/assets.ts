import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { findTeamById } from "@ondevaipassar/shared";

const ASSETS_DIR = fileURLToPath(new URL("./assets/", import.meta.url));

function readSvgDataUri(path: string): string {
  const base64 = readFileSync(path).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

function readRasterDataUri(path: string, mime: string): string {
  const base64 = readFileSync(path).toString("base64");
  return `data:${mime};base64,${base64}`;
}

// A crest's own SVG canvas doesn't tell us its real shape — a circular
// badge (e.g. Cruzeiro) fills a square canvas edge to edge, but a pointed
// shield (e.g. Flamengo) sits centered in the same square canvas with real
// transparent padding on the sides (every crest file declares a square
// viewBox regardless of the actual silhouette drawn inside it). Rendering
// every crest into an identical square box then put a different visual
// gap between the crest and the "x" between two crests depending on which
// shape it happened to be — a shield-style crest read as sitting further
// from the x than a round one.
//
// Just computing the *right* aspect ratio and setting it as the <img>'s
// CSS width/height isn't enough on its own: objectFit:"contain" fits based
// on the image's own *declared* viewBox aspect ratio, not a number we
// pass in from outside — a still-square-declared SVG placed in a
// non-square CSS box still gets letterboxed by contain, just along a
// different axis than before (confirmed by rendering and measuring pixel
// gaps: they came out unequal, not fixed). So this actually rewrites the
// SVG's own viewBox to tightly bound its content (same technique used to
// fix the channel logo SVGs earlier, but done per-read here rather than
// as a one-off batch edit — crests are a much bigger, still-growing set
// across every tracked competition, so it isn't practical to hand-crop
// each file the way the ~17 channel logos were).
function cropSvgToContent(svg: Buffer): { svg: Buffer; aspectRatio: number } {
  const openTagMatch = svg.toString("utf-8").match(/<svg[^>]*viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"[^>]*>/);
  if (!openTagMatch) return { svg, aspectRatio: 1 }; // no viewBox to work from — render as-is rather than guess.
  const [, vbX, vbY, vbW, vbH] = openTagMatch.map(Number) as unknown as [number, number, number, number, number];

  // Render at the SVG's own declared size so the pixel grid maps 1:1 onto
  // its viewBox coordinates — no separate scale factor to carry through.
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: vbW } });
  const { width, height, pixels } = resvg.render();
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { svg, aspectRatio: 1 }; // fully transparent art shouldn't happen in practice — render as-is rather than guess.

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  const pad = Math.round(Math.max(contentW, contentH) * 0.02); // small breathing room so an edge doesn't land exactly on the crop boundary.
  const cropX = vbX + Math.max(0, minX - pad);
  const cropY = vbY + Math.max(0, minY - pad);
  const cropW = Math.min(width, maxX + pad) - Math.max(0, minX - pad) + 1;
  const cropH = Math.min(height, maxY + pad) - Math.max(0, minY - pad) + 1;

  const newOpenTag = `<svg width="${cropW}" height="${cropH}" viewBox="${cropX} ${cropY} ${cropW} ${cropH}" fill="none" xmlns="http://www.w3.org/2000/svg">`;
  const cropped = svg.toString("utf-8").replace(/<svg[^>]*>/, newOpenTag);
  return { svg: Buffer.from(cropped, "utf-8"), aspectRatio: cropW / cropH };
}

export interface CrestArt {
  dataUri: string;
  /** content width ÷ height — 1 for a crest that already fills a square canvas (most badge-style crests), less than 1 for a crest narrower than it is tall (most shield-style crests; see cropSvgToContent). */
  aspectRatio: number;
}

function loadCrestArt(svg: Buffer): CrestArt {
  const { svg: cropped, aspectRatio } = cropSvgToContent(svg);
  return { dataUri: `data:image/svg+xml;base64,${cropped.toString("base64")}`, aspectRatio };
}

const FALLBACK_CREST = loadCrestArt(readFileSync(`${ASSETS_DIR}icons/escudo-cinza.svg`));
// logo-3.svg itself is white-fill-only (built for the site header's colored
// background, see frontend's Header.tsx) — invisible on this template's
// plain white canvas. logo-3-purple.svg is a derived copy (fill="white" ->
// fill="#581c87", nothing else changed) made just for this corner mark.
export const WORDMARK = readSvgDataUri(`${ASSETS_DIR}icons/logo-3-purple.svg`);
export const VERSUS_ICON = readSvgDataUri(`${ASSETS_DIR}icons/versus.svg`);

/** Local crest art (data URI + real content aspect ratio, see CrestArt) for a tracked team, falling back to the generic gray shield for an untracked opponent or a tracked team we don't have local art for yet — same cascade as the frontend's TeamCrest, minus the source-provided-URL step (no hotlinking into an Instagram post). */
export function crestArt(teamId: string | null): CrestArt {
  const crestFile = teamId ? findTeamById(teamId)?.crestFile : undefined;
  if (!crestFile) return FALLBACK_CREST;
  try {
    return loadCrestArt(readFileSync(`${ASSETS_DIR}crests/${crestFile}`));
  } catch {
    return FALLBACK_CREST;
  }
}

// Curated square badge/icon art (each channel's real app icon or Instagram
// profile picture — see channel.ts's history) is what the poster wants:
// a uniform square that reads well small, unlike a brand's wordmark SVG
// (varies wildly in aspect ratio, previously required per-channel
// shape/box tuning that this format switch made unnecessary). SVG is kept
// only as a fallback for a channel that doesn't have curated square art
// yet. Raster formats tried in this order because that's what's actually
// been sourced per channel, not a meaningful priority.
const RASTER_FORMATS: Array<{ ext: string; mime: string }> = [
  { ext: "png", mime: "image/png" },
  { ext: "jpg", mime: "image/jpeg" },
  { ext: "jpeg", mime: "image/jpeg" },
];

/**
 * Local channel logo, or null when we don't ship art for this channel yet
 * — caller decides how to handle a channel with no renderable logo. Satori
 * renders a raster `<img>` fine, but not one nested inside an SVG's own
 * `<image>` element (confirmed: identical output whether that inner
 * element used `href` or `xlink:href`), so the SVG fallback below can't
 * just wrap a raster file the way the frontend does.
 */
export function channelLogoDataUri(channelId: string): string | null {
  for (const { ext, mime } of RASTER_FORMATS) {
    try {
      return readRasterDataUri(`${ASSETS_DIR}channels/${channelId}.${ext}`, mime);
    } catch {
      // fall through to the next format
    }
  }
  try {
    return readSvgDataUri(`${ASSETS_DIR}channels/${channelId}.svg`);
  } catch {
    return null;
  }
}

export interface LoadedFont {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
}

export function loadFonts(): LoadedFont[] {
  return [
    { name: "Roboto", data: readFileSync(`${ASSETS_DIR}fonts/Roboto-Regular.ttf`), weight: 400, style: "normal" },
    { name: "Roboto", data: readFileSync(`${ASSETS_DIR}fonts/Roboto-Bold.ttf`), weight: 700, style: "normal" },
  ];
}
