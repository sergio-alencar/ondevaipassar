import { describe, expect, it } from "vitest";
import { matchStreamsToBroadcasts, type MatchCandidate, type TeamPairStream } from "../src/ingest/broadcastMatching.js";

function buildStream(overrides: Partial<TeamPairStream> = {}): TeamPairStream {
  return {
    homeTeamId: "botafogo",
    awayTeamId: "palmeiras",
    streamDateUtc: "2026-09-06T18:30:00.000Z",
    ...overrides,
  };
}

function buildMatch(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    id: "ge-globo:1",
    homeTeamId: "botafogo",
    awayTeamId: "palmeiras",
    kickoffUtc: "2026-09-06T21:30:00.000Z",
    ...overrides,
  };
}

describe("matchStreamsToBroadcasts", () => {
  it("attaches a broadcast when exactly one match fits the team pair and date", () => {
    const result = matchStreamsToBroadcasts([buildStream()], [buildMatch()]);
    expect(result.matchIds).toEqual(["ge-globo:1"]);
    expect(result.unresolvedCount).toBe(0);
  });

  it("returns the original stream alongside each matched id, same order, for a caller that needs a per-stream field", () => {
    const stream = buildStream();
    const result = matchStreamsToBroadcasts([stream], [buildMatch()]);
    expect(result.matchedStreams).toEqual([stream]);
  });

  it("matches regardless of home/away order (a stream can list either team first)", () => {
    const result = matchStreamsToBroadcasts(
      [buildStream({ homeTeamId: "palmeiras", awayTeamId: "botafogo" })],
      [buildMatch()],
    );
    expect(result.matchIds).toEqual(["ge-globo:1"]);
  });

  it("matches when the stream's date is hours before kickoff (pre-game show lead-in), same BRT day", () => {
    // Real example: ge tv scheduled a stream 3h before a 21:30 BRT kickoff.
    const result = matchStreamsToBroadcasts(
      [buildStream({ streamDateUtc: "2026-09-06T18:30:00.000Z" })],
      [buildMatch({ kickoffUtc: "2026-09-06T21:30:00.000Z" })],
    );
    expect(result.matchIds).toEqual(["ge-globo:1"]);
  });

  it("tolerates a 1-day gap (late BRT kickoff rolling into the next UTC day)", () => {
    const result = matchStreamsToBroadcasts(
      [buildStream({ streamDateUtc: "2026-09-05T23:00:00.000Z" })],
      [buildMatch({ kickoffUtc: "2026-09-06T21:30:00.000Z" })],
    );
    expect(result.matchIds).toEqual(["ge-globo:1"]);
  });

  it("does not attach anything when no ingested match fits (counts as unresolved)", () => {
    const result = matchStreamsToBroadcasts([buildStream()], []);
    expect(result.matchIds).toEqual([]);
    expect(result.unresolvedCount).toBe(1);
  });

  it("skips rather than guesses when 2+ matches fit the same team pair and date window", () => {
    const result = matchStreamsToBroadcasts(
      [buildStream()],
      [buildMatch({ id: "a" }), buildMatch({ id: "b", kickoffUtc: "2026-09-07T00:00:00.000Z" })],
    );
    expect(result.matchIds).toEqual([]);
    expect(result.unresolvedCount).toBe(1);
  });

  it("does not match a different team pair even on the same date", () => {
    const result = matchStreamsToBroadcasts(
      [buildStream({ homeTeamId: "flamengo", awayTeamId: "vasco" })],
      [buildMatch()],
    );
    expect(result.unresolvedCount).toBe(1);
  });

  // Real bug found live: a "Europa" club (we track 20 individual clubs, not
  // entire leagues) plays almost every match against an opponent we don't
  // track at all — e.g. CazéTV's "Elversberg x Bayer Leverkusen" stream was
  // silently dropped entirely before ever reaching this function, because
  // the old code required BOTH sides to resolve to a tracked team. null on
  // one side (the untracked opponent) must still match.
  it("matches when only one side is a tracked team (an untracked opponent, e.g. a 'Europa' club's foreign rival)", () => {
    const result = matchStreamsToBroadcasts(
      [buildStream({ homeTeamId: null, awayTeamId: "palmeiras" })],
      [buildMatch({ homeTeamId: null, awayTeamId: "palmeiras" })],
    );
    expect(result.matchIds).toEqual(["ge-globo:1"]);
  });

  it("matches a tracked team regardless of which side it's listed on when the other side is untracked", () => {
    const result = matchStreamsToBroadcasts(
      [buildStream({ homeTeamId: null, awayTeamId: "palmeiras" })],
      [buildMatch({ homeTeamId: "palmeiras", awayTeamId: null })],
    );
    expect(result.matchIds).toEqual(["ge-globo:1"]);
  });

  it("does not match when the one tracked side doesn't correspond to any candidate", () => {
    const result = matchStreamsToBroadcasts(
      [buildStream({ homeTeamId: null, awayTeamId: "vasco" })],
      [buildMatch({ homeTeamId: null, awayTeamId: "palmeiras" })],
    );
    expect(result.unresolvedCount).toBe(1);
  });

  it("counts as unresolved (never wildcard-matches everything) when neither side of the stream is tracked", () => {
    const result = matchStreamsToBroadcasts([buildStream({ homeTeamId: null, awayTeamId: null })], [buildMatch()]);
    expect(result.matchIds).toEqual([]);
    expect(result.unresolvedCount).toBe(1);
  });
});
