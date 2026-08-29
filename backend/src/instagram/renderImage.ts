import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { formatKickoffLabel, type MatchView } from "@ondevaipassar/shared";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { ReactNode } from "react";
import { channelLogoDataUri, crestArt, loadFonts, VERSUS_ICON, WORDMARK } from "./assets.js";
import { buildMatchImageTree } from "./template.js";

const WIDTH = 1080;
const HEIGHT = 1080;

// Loaded once per cold start, reused across every match rendered in a run.
const fonts = loadFonts();

// satori (Yoga's layout engine) and harfbuzzjs (its text-shaping dependency)
// each load a .wasm file from disk at runtime, via a dynamically-built path
// their own compiled code constructs — not a static import/require, so
// Vercel's file tracer never discovers them and they silently go missing
// from the deployed function bundle (confirmed by inspecting a local
// `vercel build` output: every other satori/harfbuzzjs file traced fine,
// only these two didn't). The `new URL(literal, import.meta.url)` form
// below is the one pattern the tracer *does* reliably follow — same trick
// already relied on for this module's own local SVG/font assets — so
// referencing them this way, even just to warm the read, is enough to pull
// both into the bundle.
readFileSync(fileURLToPath(new URL("../../../node_modules/harfbuzzjs/hb.wasm", import.meta.url)));
readFileSync(fileURLToPath(new URL("../../../node_modules/satori/yoga.wasm", import.meta.url)));

export async function renderMatchImage(match: MatchView): Promise<Buffer> {
  const [homeCrest, awayCrest] = await Promise.all([
    crestArt(match.homeTeamId, match.homeTeamCrestUrl),
    crestArt(match.awayTeamId, match.awayTeamCrestUrl),
  ]);

  const tree = buildMatchImageTree({
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    homeCrest,
    awayCrest,
    competitionName: match.competitionName,
    kickoffLabel: formatKickoffLabel(match.kickoffUtc, match.kickoffTimeConfirmed),
    channels: match.broadcasts.map((broadcast) => ({
      displayName: broadcast.displayName,
      logoDataUri: channelLogoDataUri(broadcast.channelId),
    })),
    wordmarkDataUri: WORDMARK,
    versusIconDataUri: VERSUS_ICON,
  });

  const svg = await satori(tree as ReactNode, { width: WIDTH, height: HEIGHT, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng();
}
