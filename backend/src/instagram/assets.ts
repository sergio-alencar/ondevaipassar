import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { findTeamById } from "@ondevaipassar/shared";

const ASSETS_DIR = fileURLToPath(new URL("./assets/", import.meta.url));

function readSvgDataUri(path: string): string {
  const base64 = readFileSync(path).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

const FALLBACK_CREST = readSvgDataUri(`${ASSETS_DIR}icons/escudo-cinza.svg`);
export const WORDMARK = readSvgDataUri(`${ASSETS_DIR}icons/logo-3.svg`);
export const VERSUS_ICON = readSvgDataUri(`${ASSETS_DIR}icons/versus.svg`);

/** Local crest asset for a tracked team, falling back to the generic gray shield for an untracked opponent or a tracked team we don't have local art for yet — same cascade as the frontend's TeamCrest, minus the source-provided-URL step (no hotlinking into an Instagram post). */
export function crestDataUri(teamId: string | null): string {
  const crestFile = teamId ? findTeamById(teamId)?.crestFile : undefined;
  if (!crestFile) return FALLBACK_CREST;
  try {
    return readSvgDataUri(`${ASSETS_DIR}crests/${crestFile}`);
  } catch {
    return FALLBACK_CREST;
  }
}

/** Local channel logo, or null when we don't ship art for this channel (e.g. "getv") — caller decides how to handle a channel with no renderable logo. */
export function channelLogoDataUri(channelId: string): string | null {
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
