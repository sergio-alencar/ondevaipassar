import type { MatchView } from "./api.js";

const SITE_URL = "https://ondevaipassar.com";
/** Football has no end time on a fixture; two hours is the usual calendar block for a match. */
const EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
const MAX_LINE_BYTES = 75;

/** A match can go in a calendar only once its real kickoff time is known (otherwise kickoffUtc is a midnight placeholder). */
export function canAddToCalendar(match: Pick<MatchView, "kickoffTimeConfirmed" | "status">): boolean {
  return match.kickoffTimeConfirmed && match.status === "scheduled";
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function formatUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 §3.1: a content line longer than 75 octets continues on the next line after CRLF + one space. Counts bytes, never splits a character. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines start with a space, which counts toward the limit.
    const limit = parts.length === 0 ? MAX_LINE_BYTES : MAX_LINE_BYTES - 1;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/**
 * An iCalendar (.ics) file with one event for the match — opens in Google,
 * Apple and Outlook calendars alike, with no account involved. The event is a
 * snapshot: the channel list is whatever we knew when it was created, so the
 * description points back to the site for the live answer.
 */
export function buildMatchIcs(match: MatchView, now: Date = new Date()): string {
  const start = new Date(match.kickoffUtc);
  const end = new Date(start.getTime() + EVENT_DURATION_MS);
  const channels = match.broadcasts.map((broadcast) => broadcast.displayName);
  const where = channels.length > 0 ? `Onde assistir: ${channels.join(", ")}.` : "Canal ainda não confirmado.";
  const description = `${match.competitionName}. ${where} Confira a transmissão atualizada em ${SITE_URL}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Onde Vai Passar//ondevaipassar.com//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${match.id}@ondevaipassar.com`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeText(`${match.homeTeamName} x ${match.awayTeamName}`)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${SITE_URL}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** File name that is safe on every OS: "flamengo-x-palmeiras.ics". */
export function matchIcsFileName(match: Pick<MatchView, "homeTeamName" | "awayTeamName">): string {
  const slug = `${match.homeTeamName} x ${match.awayTeamName}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "jogo"}.ics`;
}
