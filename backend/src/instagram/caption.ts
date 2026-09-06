import { formatKickoffLabel, REGIONAL_CAVEAT_TEXT, REGIONAL_PRACA_CAVEAT, type MatchView } from "@ondevaipassar/shared";

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

  const regionalDetailBroadcast = match.broadcasts.find((broadcast) => broadcast.regionalDetail);
  if (regionalDetailBroadcast) {
    lines.push(`* ${regionalDetailBroadcast.displayName} disponível em: ${regionalDetailBroadcast.regionalDetail} (${REGIONAL_PRACA_CAVEAT})`);
  } else if (match.broadcasts.some((broadcast) => broadcast.regionalCaveat)) {
    lines.push(`* ${REGIONAL_CAVEAT_TEXT}`);
  }

  // Omitted entirely when no broadcast in this match has a verified handle
  // yet, rather than a line with nothing on it.
  if (handles) lines.push(handles);

  return lines.join("\n");
}
