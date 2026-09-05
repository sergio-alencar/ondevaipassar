// Compares calendar day in Brasília time, not the caller's local timezone —
// a match near midnight BRT could otherwise show up as "today" a day early
// or late for anyone (or anything) outside that timezone.
export function isTodayInBrasilia(kickoffUtc: string, now: Date = new Date()): boolean {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  return format.format(now) === format.format(new Date(kickoffUtc));
}

// Adding a flat 24h and re-formatting in the target timezone is safe here
// specifically because Brazil has used a fixed UTC-3 offset (no DST) since
// 2019 — same assumption this codebase's own ingest code already relies on
// elsewhere; a country that still observes DST could land on the wrong
// calendar day this way once or twice a year.
export function isTomorrowInBrasilia(kickoffUtc: string, now: Date = new Date()): boolean {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return format.format(tomorrow) === format.format(new Date(kickoffUtc));
}

// Midnight BRT = 03:00 UTC on the same calendar day (fixed UTC-3, no DST,
// same assumption as isTomorrowInBrasilia above) — used as the `from` the
// frontend sends /api/matches, instead of leaving that param off entirely
// (which defaults to "right now" server-side, see getMatchViews.ts). That
// default is why a "Jogos de Hoje" section reads correctly all morning but
// silently empties out every afternoon as each match's own kickoff instant
// passes "now" — anchoring on the start of today instead keeps a match
// that already kicked off (or even finished) counted as still "today"
// long after that.
export function startOfTodayInBrasiliaUtc(now: Date = new Date()): string {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  return `${format.format(now)}T03:00:00.000Z`;
}

/** Just the date half of formatKickoffLabel ("sábado, 5/set") — the digest's own header needs it without a time attached. */
export function formatDateLabel(kickoffUtc: string): string {
  const date = new Date(kickoffUtc);
  const timeZone = "America/Sao_Paulo";

  // pt-BR gives "quinta-feira" / "domingo" / "sábado" for weekday:"long" —
  // only the weekdays-proper carry a "-feira" suffix to strip; weekend days
  // don't (confirmed live, not assumed).
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone }).format(date).replace(/-feira$/, "");
  const day = new Intl.DateTimeFormat("pt-BR", { day: "numeric", timeZone }).format(date);
  // pt-BR gives "ago." for month:"short" — strip the trailing period.
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone }).format(date).replace(/\.$/, "");
  return `${weekday}, ${day}/${month}`;
}

/** Just the time half ("19h" / "21h30" / "horário a confirmar") — one line per match in the digest already carries the date in its own header. */
export function formatTimeLabel(kickoffUtc: string, kickoffTimeConfirmed: boolean): string {
  if (!kickoffTimeConfirmed) return "horário a confirmar";

  const date = new Date(kickoffUtc);
  const timeZone = "America/Sao_Paulo";
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone }).format(date));
  const minute = Number(new Intl.DateTimeFormat("pt-BR", { minute: "numeric", timeZone }).format(date));
  return minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, "0")}`;
}

// Compact, social-media-casual format ("segunda, 6/ago, 19h" / "...21h30")
// — shared by the site (MatchCard.tsx) and the Instagram poster
// (caption.ts, renderImage.ts) so a match's date/time reads identically
// everywhere instead of drifting into two separately-maintained formats.
export function formatKickoffLabel(kickoffUtc: string, kickoffTimeConfirmed: boolean): string {
  return `${formatDateLabel(kickoffUtc)}, ${formatTimeLabel(kickoffUtc, kickoffTimeConfirmed)}`;
}
