import type { MatchView } from "@ondevaipassar/shared";
import { buildMatchIcs, canAddToCalendar, matchIcsFileName } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";

const match = {
  id: "ge-globo__abc",
  competitionId: "brasileirao-serie-a",
  competitionName: "Brasileirão Série A",
  homeTeamId: "flamengo",
  homeTeamName: "Flamengo",
  homeTeamCrestUrl: "",
  awayTeamId: "palmeiras",
  awayTeamName: "São Paulo, SP; \\ teste",
  awayTeamCrestUrl: "",
  kickoffUtc: "2026-10-15T22:30:00.000Z",
  kickoffTimeConfirmed: true,
  round: 1,
  status: "scheduled",
  broadcasts: [{ displayName: "Globo" }, { displayName: "Premiere" }],
} as unknown as MatchView;

describe("buildMatchIcs", () => {
  const ics = buildMatchIcs(match, new Date("2026-10-12T12:00:00Z"));

  it("is a CRLF-terminated calendar with one event at the right UTC times", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261015T223000Z");
    expect(ics).toContain("DTEND:20261016T003000Z");
    expect(ics).toContain("DTSTAMP:20261012T120000Z");
    expect(ics).toContain("UID:ge-globo__abc@ondevaipassar.com");
  });

  it("escapes commas, semicolons and backslashes in the title", () => {
    expect(ics).toContain("SUMMARY:Flamengo x São Paulo\\, SP\; \\\\ teste");
  });

  it("lists the channels, and keeps every line within 75 bytes", () => {
    expect(ics.replace(/\r\n /g, "")).toContain("Onde assistir: Globo\\, Premiere.");
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("says so when no channel is confirmed yet", () => {
    expect(buildMatchIcs({ ...match, broadcasts: [] }).replace(/\r\n /g, "")).toContain("Canal ainda não confirmado.");
  });
});

describe("canAddToCalendar / matchIcsFileName", () => {
  it("needs a confirmed time and a scheduled match", () => {
    expect(canAddToCalendar(match)).toBe(true);
    expect(canAddToCalendar({ ...match, kickoffTimeConfirmed: false })).toBe(false);
    expect(canAddToCalendar({ ...match, status: "finished" })).toBe(false);
  });

  it("makes an ascii file name", () => {
    expect(matchIcsFileName({ homeTeamName: "São Paulo", awayTeamName: "Grêmio" })).toBe("sao-paulo-x-gremio.ics");
  });
});
