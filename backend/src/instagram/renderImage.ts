import type { MatchView } from "@ondevaipassar/shared";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { ReactNode } from "react";
import { channelLogoDataUri, crestDataUri, loadFonts, VERSUS_ICON, WORDMARK } from "./assets.js";
import { buildMatchImageTree } from "./template.js";

const WIDTH = 1080;
const HEIGHT = 1350;

// Loaded once per cold start, reused across every match rendered in a run.
const fonts = loadFonts();

function formatKickoffLabel(kickoffUtc: string): string {
  const date = new Date(kickoffUtc);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(date);
  const timeLabel = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return `${dateLabel}, ${timeLabel}`;
}

export async function renderMatchImage(match: MatchView): Promise<Buffer> {
  const tree = buildMatchImageTree({
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    homeCrestDataUri: crestDataUri(match.homeTeamId),
    awayCrestDataUri: crestDataUri(match.awayTeamId),
    competitionName: match.competitionName,
    kickoffLabel: formatKickoffLabel(match.kickoffUtc),
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
