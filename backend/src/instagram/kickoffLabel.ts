// Compact, social-media-casual format ("segunda, 6/ago, 19h" / "...21h30"),
// distinct from the site's own fuller kickoff formatting (MatchCard.tsx) —
// shared by caption.ts and renderImage.ts so the post's image and its
// caption text never drift out of sync on how a kickoff is described.
export function formatKickoffLabel(kickoffUtc: string, kickoffTimeConfirmed: boolean): string {
  const date = new Date(kickoffUtc);
  const timeZone = "America/Sao_Paulo";

  // pt-BR gives "quinta-feira" / "domingo" / "sábado" for weekday:"long" —
  // only the weekdays-proper carry a "-feira" suffix to strip; weekend days
  // don't (confirmed live, not assumed).
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone }).format(date).replace(/-feira$/, "");
  const day = new Intl.DateTimeFormat("pt-BR", { day: "numeric", timeZone }).format(date);
  // pt-BR gives "ago." for month:"short" — strip the trailing period.
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone }).format(date).replace(/\.$/, "");
  const dateLabel = `${weekday}, ${day}/${month}`;

  if (!kickoffTimeConfirmed) return `${dateLabel}, horário a confirmar`;

  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone }).format(date));
  const minute = Number(new Intl.DateTimeFormat("pt-BR", { minute: "numeric", timeZone }).format(date));
  const timeLabel = minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, "0")}`;
  return `${dateLabel}, ${timeLabel}`;
}
