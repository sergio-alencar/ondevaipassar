import { formatKickoffLabel, type MatchView } from "@ondevaipassar/shared";

// Same wording/precedence as the frontend's MatchBroadcasts.tsx: the real
// per-state text (futnatv's own, see futnatvEnrichment.ts) beats the
// generic brush-off whenever we actually have it for one of the match's
// broadcasts.
const REGIONAL_CAVEAT_CAPTION = "A transmissão pela Globo pode variar por região — confira a programação local";

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
    lines.push(`* ${regionalDetailBroadcast.displayName} disponível em: ${regionalDetailBroadcast.regionalDetail}`);
  } else if (match.broadcasts.some((broadcast) => broadcast.regionalCaveat)) {
    lines.push(`* ${REGIONAL_CAVEAT_CAPTION}`);
  }

  // Omitted entirely when no broadcast in this match has a verified handle
  // yet, rather than a line with nothing on it.
  if (handles) lines.push(handles);

  return lines.join("\n");
}
