import { describe, expect, it } from "vitest";
import { isUpsertNoOp } from "../src/ingest/onefootballEnrichment.js";

const row = { homeTeamCrestUrl: "https://img/h.png", awayTeamCrestUrl: "https://img/a.png", kickoffUtc: "2026-10-21T19:00:00.000Z", round: 3 };

describe("isUpsertNoOp", () => {
  it("is true for a stored row that already matches what the page says", () => {
    expect(isUpsertNoOp(row, { ...row })).toBe(true);
  });

  it("is false when there is no stored row, which is an insert", () => {
    expect(isUpsertNoOp(undefined, row)).toBe(false);
  });

  // Each field below is one the upsert would have changed, so skipping the
  // write would leave stale data in the table.
  it("is false as soon as any field the upsert writes differs", () => {
    expect(isUpsertNoOp(row, { ...row, kickoffUtc: "2026-10-21T20:00:00.000Z" })).toBe(false); // rescheduled
    expect(isUpsertNoOp(row, { ...row, round: 4 })).toBe(false);
    expect(isUpsertNoOp(row, { ...row, homeTeamCrestUrl: "https://img/h2.png" })).toBe(false);
    expect(isUpsertNoOp(row, { ...row, awayTeamCrestUrl: "https://img/a2.png" })).toBe(false);
  });

  it("treats a round that appears or disappears as a change", () => {
    expect(isUpsertNoOp({ ...row, round: null }, row)).toBe(false);
    expect(isUpsertNoOp(row, { ...row, round: null })).toBe(false);
    expect(isUpsertNoOp({ ...row, round: null }, { ...row, round: null })).toBe(true);
  });
});
