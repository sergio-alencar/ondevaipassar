/** Shared by caption.ts and renderImage.ts so the post's image and its caption text never drift out of sync on how a kickoff is described. */
export function formatKickoffLabel(kickoffUtc: string, kickoffTimeConfirmed: boolean): string {
  const date = new Date(kickoffUtc);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(date);
  if (!kickoffTimeConfirmed) return `${dateLabel}, horário a confirmar`;
  const timeLabel = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return `${dateLabel}, ${timeLabel}`;
}
