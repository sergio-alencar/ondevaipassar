import type { MatchView } from "@ondevaipassar/shared";

function formatCaptionDate(kickoffUtc: string): string {
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

export function buildCaption(match: MatchView): string {
  const channels = match.broadcasts.map((broadcast) => broadcast.displayName).join(", ");
  return [
    `${match.homeTeamName} x ${match.awayTeamName}`,
    match.competitionName,
    formatCaptionDate(match.kickoffUtc),
    `Transmissão: ${channels}`,
  ].join("\n");
}
