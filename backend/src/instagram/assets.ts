import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { findTeamById } from "@ondevaipassar/shared";
import { isAllowedCrestUrl } from "../api/routes/crestProxy.js";
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

/**
 * Fetches a hotlinked crest (same allowlisted hosts as crestProxy.ts — an
 * untracked opponent's crest only ever exists as ge.globo's/OneFootball's
 * own URL, never ours to store) and turns it into CrestArt. SVG gets the
 * same viewBox crop local art already gets; a raster crest (OneFootball's
 * are PNG, see crestProxy.ts) is embedded as-is — Satori renders a raster
 * `<img>` fine (see channelLogoDataUri's own comment on that), and this
 * project has no image-dimension library to compute its real aspect ratio,
 * so it defaults to 1 (square), close enough for the badge-style crests
 * actually seen from these two sources. Returns null on any failure
 * (disallowed host, network error, timeout, or an SVG Satori can't render —
 * see the viewBox check below) — caller falls back to the generic shield,
 * same as a tracked team missing its local file.
 */
async function fetchHotlinkedCrestArt(sourceUrl: string): Promise<CrestArt | null> {
  if (!isAllowedCrestUrl(sourceUrl)) return null;
  try {
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    const body = Buffer.from(await response.arrayBuffer());
    if (!contentType.includes("svg")) {
      return { dataUri: `data:${contentType || "application/octet-stream"};base64,${body.toString("base64")}`, aspectRatio: 1 };
    }
    // Real bug found live: a ge.globo crest without a viewBox (some do
    // ship this way — only "width="800px" height="800px"" — confirmed on
    // Elversberg's own crest) crashed Satori entirely ("Failed to parse
    // SVG ... missing viewBox"), taking the WHOLE Instagram post down with
    // it, not just that one crest. cropSvgToContent itself silently
    // no-ops without a viewBox (fine for the frontend's own browser-based
    // crestProxy use, which doesn't need one) — Satori does, so this
    // synthesizes one from the width/height ge.globo already gives before
    // handing off to it, rather than settling for the generic shield when
    // the real dimensions are sitting right there. If even that can't
    // produce one (no width/height either — none seen live yet, but cheap
    // to guard), still refuse to hand Satori something it'll choke on.
    const withViewBox = ensureSvgViewBox(body);
    if (!withViewBox.toString("utf-8").includes("viewBox")) return null;
    return loadCrestArt(withViewBox);
  } catch {
    return null;
  }
}

const WIDTH_HEIGHT_PATTERN = /<svg\b[^>]*\bwidth="([\d.]+)(?:px)?"[^>]*\bheight="([\d.]+)(?:px)?"/;

/** Injects a `viewBox="0 0 W H"` synthesized from the SVG's own width/height attributes when it's missing one entirely — a no-op (same buffer back) when a viewBox is already present, or when even width/height can't be found. */
function ensureSvgViewBox(svg: Buffer): Buffer {
  const text = svg.toString("utf-8");
  if (text.includes("viewBox")) return svg;
  const match = text.match(WIDTH_HEIGHT_PATTERN);
  if (!match) return svg;
  const [, width, height] = match;
  return Buffer.from(text.replace("<svg", `<svg viewBox="0 0 ${width} ${height}"`));
}

/** Local crest art (data URI + real content aspect ratio, see CrestArt) for a tracked team; for an untracked opponent, fetches the source's own hotlinked crest (see fetchHotlinkedCrestArt) when one was given; falls back to the generic gray shield when neither is available. */
export async function crestArt(teamId: string | null, sourceCrestUrl?: string | null): Promise<CrestArt> {
  const crestFile = teamId ? findTeamById(teamId)?.crestFile : undefined;
  if (crestFile) {
    try {
      return loadCrestArt(readFileSync(`${ASSETS_DIR}crests/${crestFile}`));
    } catch {
      // fall through to the source-hotlink / generic-shield cascade below
    }
  }
  if (sourceCrestUrl) {
    const hotlinked = await fetchHotlinkedCrestArt(sourceCrestUrl);
    if (hotlinked) return hotlinked;
  }
  return FALLBACK_CREST;
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
