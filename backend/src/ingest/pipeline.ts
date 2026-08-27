import { COMPETITIONS, TEAMS } from "@ondevaipassar/shared";
import { db } from "../db/client.js";
import { broadcasts, competitions, matches, scrapeRuns, teams } from "../db/schema.js";
import { getErrorMessage } from "../lib/errors.js";
import type { FixtureSourceAdapter } from "../sources/types.js";

/** Idempotently upserts the code-authoritative team/competition registries into the DB, so matches/broadcasts get real FK-shaped ids to join against. Registry data itself is never edited at runtime — renaming a team is a code change, not a DB write. Batched into one round-trip since the DB is a remote Turso instance in production, not a local file — per-row awaits would each pay real network latency. */
export async function seedRegistry(): Promise<void> {
  const teamUpserts = TEAMS.map((team) =>
    db
      .insert(teams)
      .values({ id: team.id, displayName: team.displayName })
      .onConflictDoUpdate({ target: teams.id, set: { displayName: team.displayName } }),
  );
  const competitionUpserts = COMPETITIONS.map((competition) =>
    db
      .insert(competitions)
      .values({ id: competition.id, displayName: competition.displayName })
      .onConflictDoUpdate({ target: competitions.id, set: { displayName: competition.displayName } }),
  );

  const [first, ...rest] = [...teamUpserts, ...competitionUpserts];
  if (first) await db.batch([first, ...rest]);
}

/** Runs one source end to end: fetch -> upsert matches+broadcasts -> record a scrape_runs row. A failing source never throws past this point — the next scheduled run is unaffected. */
export async function runAdapter(adapter: FixtureSourceAdapter): Promise<void> {
  const startedAt = new Date().toISOString();

  try {
    const { matches: canonicalMatches, unresolvedCount } = await adapter.fetchMatches();
    const now = new Date().toISOString();

    const matchUpserts = canonicalMatches.map((match) =>
      db
        .insert(matches)
        .values({
          id: match.id,
          competitionId: match.competitionId,
          homeTeamId: match.homeTeamId,
          homeTeamNameRaw: match.homeTeamNameRaw,
          homeTeamCrestUrl: match.homeTeamCrestUrl,
          awayTeamId: match.awayTeamId,
          awayTeamNameRaw: match.awayTeamNameRaw,
          awayTeamCrestUrl: match.awayTeamCrestUrl,
          kickoffUtc: match.kickoffUtc,
          kickoffTimeConfirmed: match.kickoffTimeConfirmed,
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
            homeTeamCrestUrl: match.homeTeamCrestUrl,
            awayTeamId: match.awayTeamId,
            awayTeamCrestUrl: match.awayTeamCrestUrl,
            kickoffUtc: match.kickoffUtc,
            kickoffTimeConfirmed: match.kickoffTimeConfirmed,
            round: match.round,
            status: match.status,
            updatedAt: now,
          },
        }),
    );

    const broadcastUpserts = canonicalMatches.flatMap((match) =>
      match.broadcasts.map((broadcast) =>
        db
          .insert(broadcasts)
          .values({
            id: `${match.id}__${broadcast.channelId}`,
            matchId: match.id,
            channelId: broadcast.channelId,
            logoUrl: broadcast.logoUrl,
            sourceId: adapter.id,
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: broadcasts.id,
            set: { logoUrl: broadcast.logoUrl },
          }),
      ),
    );

    const [first, ...rest] = [...matchUpserts, ...broadcastUpserts];
    if (first) await db.batch([first, ...rest]);

    await db.insert(scrapeRuns).values({
      sourceId: adapter.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: unresolvedCount === 0 ? "ok" : "partial",
      matchesFound: canonicalMatches.length,
      matchesUnresolved: unresolvedCount,
    });

    console.log(`[${adapter.id}] ingested ${canonicalMatches.length} matches (${unresolvedCount} unresolved)`);
  } catch (error) {
    await db.insert(scrapeRuns).values({
      sourceId: adapter.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      matchesFound: 0,
      matchesUnresolved: 0,
      errorMessage: getErrorMessage(error),
    });
    console.error(`[${adapter.id}] run failed:`, error);
  }
}
