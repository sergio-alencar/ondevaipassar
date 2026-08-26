// Compares calendar day in Brasília time, not the caller's local timezone —
// a match near midnight BRT could otherwise show up as "today" a day early
// or late for anyone (or anything) outside that timezone.
export function isTodayInBrasilia(kickoffUtc: string, now: Date = new Date()): boolean {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  return format.format(now) === format.format(new Date(kickoffUtc));
}
