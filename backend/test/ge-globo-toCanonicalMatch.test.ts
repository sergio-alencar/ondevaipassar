import { describe, expect, it } from "vitest";
import { toCanonicalMatch } from "../src/sources/ge-globo/adapter.js";
import type { SoccerEvent } from "../src/sources/ge-globo/schema.js";

function buildEvent(overrides: Partial<SoccerEvent["match"]> = {}): SoccerEvent {
  return {
    __typename: "SoccerEvent",
    match: {
      id: 12345,
      firstContestant: { id: 1, name: "Corinthians", popularName: "Corinthians", badgeSvg: "a.svg", badgePng: "a.png" },
      secondContestant: { id: 2, name: "Santos", popularName: "Santos", badgeSvg: "b.svg", badgePng: "b.png" },
      liveWatchSources: [],
      moment: "future",
      phase: { championshipEdition: { championship: { name: "Campeonato Brasileiro Série A" } } },
      result: null,
      round: 25,
      startDate: "2026-08-30",
      startHour: "16:00:00",
      ...overrides,
    },
  };
}

describe("toCanonicalMatch — kickoff time confirmation", () => {
  it("marks the kickoff confirmed and computes the real BRT->UTC time when both date and hour are known", () => {
    const canonical = toCanonicalMatch(buildEvent());
    expect(canonical?.kickoffTimeConfirmed).toBe(true);
    expect(canonical?.kickoffUtc).toBe("2026-08-30T19:00:00.000Z");
  });

  it("still produces a match (not null) when only the date is known — real ge.globo behavior for far-future rounds, confirmed live", () => {
    const canonical = toCanonicalMatch(buildEvent({ startHour: null }));
    expect(canonical).not.toBeNull();
    expect(canonical?.kickoffTimeConfirmed).toBe(false);
    // Midnight BRT placeholder — used for day-sorting only, never shown as a real time.
    expect(canonical?.kickoffUtc).toBe("2026-08-30T03:00:00.000Z");
  });

  it("returns null when even the date is unknown — nothing usable to show or sort by", () => {
    const canonical = toCanonicalMatch(buildEvent({ startDate: null, startHour: null }));
    expect(canonical).toBeNull();
  });
});
