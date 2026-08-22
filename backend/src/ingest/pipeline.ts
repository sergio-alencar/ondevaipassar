import { COMPETITIONS, TEAMS } from "@ondevaipassar/shared";
import { db } from "../db/client.js";
import { broadcasts, competitions, matches, scrapeRuns, teams } from "../db/schema.js";
import type { FixtureSourceAdapter } from "../sources/types.js";

/** Idempotently upserts the code-authoritative team/competition registries into the DB, so matches/broadcasts get real FK-shaped ids to join against. Registry data itself is never edited at runtime — renaming a team is a code change, not a DB write. */
export function seedRegistry(): void {
  for (const team of TEAMS) {
    db.insert(teams)
      .values({ id: team.id, displayName: team.displayName })
      .onConflictDoUpdate({ target: teams.id, set: { displayName: team.displayName } })
      .run();
  }
  for (const competition of COMPETITIONS) {
    db.insert(competitions)
      .values({ id: competition.id, displayName: competition.displayName })
      .onConflictDoUpdate({ target: competitions.id, set: { displayName: competition.displayName } })
      .run();
  }
}

/** Runs one source end to end: fetch -> upsert matches+broadcasts -> record a scrape_runs row. A failing source never throws past this point — the next source (or the next scheduled run) is unaffected. */
export async function runAdapter(adapter: FixtureSourceAdapter): Promise<void> {
  const startedAt = new Date().toISOString();

  try {
    const { matches: canonicalMatches, unresolvedCount } = await adapter.fetchMatches();
    const now = new Date().toISOString();

    for (const match of canonicalMatches) {
      db.insert(matches)
        .values({
          id: match.id,
          competitionId: match.competitionId,
          homeTeamId: match.homeTeamId,
          homeTeamNameRaw: match.homeTeamNameRaw,
          awayTeamId: match.awayTeamId,
          awayTeamNameRaw: match.awayTeamNameRaw,
          kickoffUtc: match.kickoffUtc,
          round: match.round,
          status: match.status,
          sourceId: adapter.id,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: matches.id,
          set: {
            competitionId: match.competitionId,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            kickoffUtc: match.kickoffUtc,
            round: match.round,
            status: match.status,
            updatedAt: now,
          },
        })
        .run();

      for (const channelId of match.broadcastChannelIds) {
        db.insert(broadcasts)
          .values({ id: `${match.id}__${channelId}`, matchId: match.id, channelId, sourceId: adapter.id, createdAt: now })
          .onConflictDoNothing()
          .run();
      }
    }

    db.insert(scrapeRuns)
      .values({
        sourceId: adapter.id,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: unresolvedCount === 0 ? "ok" : "partial",
        matchesFound: canonicalMatches.length,
        matchesUnresolved: unresolvedCount,
      })
      .run();

    console.log(`[${adapter.id}] ingested ${canonicalMatches.length} matches (${unresolvedCount} unresolved)`);
  } catch (error) {
    db.insert(scrapeRuns)
      .values({
        sourceId: adapter.id,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: "failed",
        matchesFound: 0,
        matchesUnresolved: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      .run();
    console.error(`[${adapter.id}] run failed:`, error);
  }
}
