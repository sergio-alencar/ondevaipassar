import { describe, expect, it } from "vitest";
import { findBackfillTargets, findCoveringMatches, type Candidate, type MatchRow } from "../src/ingest/onefootballEnrichment.js";

function buildCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    homeTeamId: "bayern_munique",
    awayTeamId: null,
    kickoffUtc: "2026-08-28T18:30:00Z",
    ...overrides,
  };
}

function buildMatch(overrides: Partial<MatchRow> = {}): MatchRow {
  return {
    id: "ge-globo:1",
    homeTeamId: "bayern_munique",
    awayTeamId: null,
    kickoffUtc: "2026-08-28T18:30:00.000Z",
    kickoffTimeConfirmed: true,
    round: null,
    ...overrides,
  };
}

describe("findCoveringMatches", () => {
  it("finds a ge.globo-sourced match for the same tracked team + date (an untracked opponent on both sides)", () => {
    const covering = findCoveringMatches(buildCandidate(), [buildMatch()]);
    expect(covering.map((m) => m.id)).toEqual(["ge-globo:1"]);
  });

  it("matches regardless of home/away order", () => {
    const covering = findCoveringMatches(
      buildCandidate({ homeTeamId: null, awayTeamId: "bayern_munique" }),
      [buildMatch({ homeTeamId: "bayern_munique", awayTeamId: null })],
    );
    expect(covering.map((m) => m.id)).toEqual(["ge-globo:1"]);
  });

  it("finds nothing when no existing match involves the tracked team on that date", () => {
    const covering = findCoveringMatches(buildCandidate(), [buildMatch({ homeTeamId: "real_madrid" })]);
    expect(covering).toEqual([]);
  });

  it("never wildcard-matches when neither side of the candidate is tracked", () => {
    const covering = findCoveringMatches(buildCandidate({ homeTeamId: null, awayTeamId: null }), [buildMatch()]);
    expect(covering).toEqual([]);
  });

  it("tolerates a 1-day gap between the candidate's and the existing match's date", () => {
    const covering = findCoveringMatches(
      buildCandidate({ kickoffUtc: "2026-08-27T23:00:00Z" }),
      [buildMatch({ kickoffUtc: "2026-08-28T18:30:00.000Z" })],
    );
    expect(covering.map((m) => m.id)).toEqual(["ge-globo:1"]);
  });

  it("finds both an onefootball-owned row and a ge.globo row when both exist for the same fixture (the self-healing case)", () => {
    const covering = findCoveringMatches(buildCandidate(), [buildMatch({ id: "ge-globo:1" }), buildMatch({ id: "onefootball:99" })]);
    expect(covering.map((m) => m.id).sort()).toEqual(["ge-globo:1", "onefootball:99"]);
  });
});

describe("findBackfillTargets", () => {
  it("backfills a match whose kickoff time isn't confirmed yet, when both sources agree on the calendar day", () => {
    const target = buildMatch({ kickoffTimeConfirmed: false, kickoffUtc: "2026-08-28T03:00:00.000Z" }); // midnight-BRT placeholder for Aug 28
    const targets = findBackfillTargets(buildCandidate({ kickoffUtc: "2026-08-28T18:30:00Z" }), [target]);
    expect(targets).toEqual([target]);
  });

  it("never touches a match whose kickoff time is already confirmed, even on the same day", () => {
    const confirmed = buildMatch({ kickoffTimeConfirmed: true, kickoffUtc: "2026-08-28T03:00:00.000Z" });
    expect(findBackfillTargets(buildCandidate({ kickoffUtc: "2026-08-28T18:30:00Z" }), [confirmed])).toEqual([]);
  });

  it("refuses to backfill across a day boundary, even within findCoveringMatches's own wider tolerance (the real discrepancy found live)", () => {
    // A real case found live: OneFootball's own date for a fixture was a
    // full day apart from the existing (unconfirmed-time) ge.globo date —
    // findCoveringMatches's ±1-day tolerance would still treat them as the
    // same fixture, but backfilling the OTHER source's date here would
    // silently move the match to a different day, not just fill in a time.
    const target = buildMatch({ kickoffTimeConfirmed: false, kickoffUtc: "2026-09-12T03:00:00.000Z" }); // midnight-BRT placeholder for Sep 12
    const targets = findBackfillTargets(buildCandidate({ kickoffUtc: "2026-09-13T12:00:00Z" }), [target]); // OneFootball says Sep 13
    expect(targets).toEqual([]);
  });
});
