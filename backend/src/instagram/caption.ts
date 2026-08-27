import type { MatchView } from "@ondevaipassar/shared";
import { formatKickoffLabel } from "./kickoffLabel.js";

export function buildCaption(match: MatchView): string {
  const channels = match.broadcasts.map((broadcast) => broadcast.displayName).join(", ");
  const handles = match.broadcasts
    .flatMap((broadcast) => (broadcast.instagramHandle ? [`@${broadcast.instagramHandle}`] : []))
    .join(" ");

  const lines = [
    `${match.homeTeamName} x ${match.awayTeamName}`,
    match.competitionName,
    formatKickoffLabel(match.kickoffUtc, match.kickoffTimeConfirmed),
    `Transmissão: ${channels}`,
  ];
  // Omitted entirely when no broadcast in this match has a verified handle
  // yet, rather than a line with nothing on it.
  if (handles) lines.push(handles);

  return lines.join("\n");
}
