import { describe, expect, it } from "vitest";
import { findCoveringMatches, type Candidate, type MatchRow } from "../src/ingest/onefootballEnrichment.js";

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
