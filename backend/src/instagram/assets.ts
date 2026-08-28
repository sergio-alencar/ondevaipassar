import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { findTeamById } from "@ondevaipassar/shared";
import { cropSvgToContent } from "../lib/svgCrop.js";

const ASSETS_DIR = fileURLToPath(new URL("./assets/", import.meta.url));

function readSvgDataUri(path: string): string {
  const base64 = readFileSync(path).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

function readRasterDataUri(path: string, mime: string): string {
  const base64 = readFileSync(path).toString("base64");
  return `data:${mime};base64,${base64}`;
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
