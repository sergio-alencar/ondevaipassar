import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractScheduleTeam } from "../src/sources/ge-globo/client.js";
import { parseSoccerEvent } from "../src/sources/ge-globo/schema.js";

const fixturePath = fileURLToPath(new URL("./fixtures/ge-globo-flamengo.html", import.meta.url));
const fixtureHtml = readFileSync(fixturePath, "utf-8");

describe("extractScheduleTeam", () => {
  it("extracts the embedded schedule JSON from a real saved ge.globo page", () => {
    const schedule = extractScheduleTeam(fixtureHtml);
    expect(schedule.teamAgenda.future.length).toBeGreaterThan(0);
    expect(schedule.teamAgenda.past.length).toBeGreaterThan(0);
  });

  it("throws a clear error when the marker is missing (page structure changed)", () => {
    expect(() => extractScheduleTeam("<html><body>no data here</body></html>")).toThrow(
      /scheduleTeam.*not found/,
    );
  });

  it("parses individual events into the expected shape, skipping none that are well-formed", () => {
    const schedule = extractScheduleTeam(fixtureHtml);
    const parsed = schedule.teamAgenda.future.map(parseSoccerEvent);
    const validCount = parsed.filter((event) => event !== null).length;
    // Every event in this saved fixture is well-formed (some legitimately have
    // null startDate/startHour for not-yet-scheduled matches, which is still a
    // valid parse — only genuinely malformed shapes should fail to parse).
    expect(validCount).toBe(schedule.teamAgenda.future.length);
  });

  it("surfaces both contestants' popular names for a known match", () => {
    const schedule = extractScheduleTeam(fixtureHtml);
    const events = schedule.teamAgenda.future.map(parseSoccerEvent).filter((event) => event !== null);
    const names = events.flatMap((event) => [event.match.firstContestant.popularName, event.match.secondContestant.popularName]);
    expect(names).toContain("Flamengo");
  });
});
