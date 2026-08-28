import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { matches, scrapeRuns } from "../db/schema.js";
import { getErrorMessage } from "../lib/errors.js";
import { fetchCompetitionMatchCards, type RoundMatchCard } from "../sources/onefootball/client.js";
import { runBroadcastSource } from "./attachBroadcasts.js";
import { resolveTeamId } from "./teamResolver.js";

const SOURCE_ID = "onefootball";
const SOURCE_ID_PREFIX = `${SOURCE_ID}:`;
// Same 1-day tolerance as broadcastMatching.ts, and the same reasoning:
// absorbs a BRT-kickoff-crossing-midnight-UTC rollover without risking a
// same-pair-rematch (e.g. a two-legged tie) matching the wrong leg.
const DATE_TOLERANCE_DAYS = 1;

// Same 5 competitions as ge-globo-round's own European HUB_SOURCES — every
// slug verified live (page title matches the competition, not a guess:
// several plausible-looking slugs silently served Bundesliga's own content
// instead of 404ing, confirmed live against "ligue-1" specifically, so
// only slugs pulled from a real page's own links to itself were trusted).
const COMPETITIONS: { slug: string; competitionId: string }[] = [
  { slug: "premier-league-9", competitionId: "premier-league" },
  { slug: "laliga-10", competitionId: "la-liga" },
  { slug: "bundesliga-1", competitionId: "bundesliga" },
  { slug: "ligue-1-23", competitionId: "ligue-1" },
  { slug: "serie-a-13", competitionId: "serie-a-italiana" },
];

export interface Candidate {
  homeTeamId: string | null;
  awayTeamId: string | null;
  kickoffUtc: string;
}

export interface MatchRow {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  kickoffUtc: string;
}

// null on the candidate side means "untracked opponent" — a wildcard, not
// a mismatch. Same rule as broadcastMatching.ts's own teamMatches; not
// imported from there since that module works in terms of TeamPairStream
// specifically (also brings in an unrelated matchIds/unresolvedCount
// return shape this doesn't want).
function teamMatches(candidateTeamId: string | null, matchTeamId: string | null): boolean {
  return candidateTeamId === null || candidateTeamId === matchTeamId;
}

interface CalendarDate {
  day: number;
  month: number;
  year: number;
}

function toBrtCalendarDate(utcIso: string): CalendarDate {
  const brt = new Date(new Date(utcIso).getTime() - 3 * 60 * 60 * 1000);
  return { day: brt.getUTCDate(), month: brt.getUTCMonth() + 1, year: brt.getUTCFullYear() };
}

function daysBetween(a: CalendarDate, b: CalendarDate): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / msPerDay;
}

/** Every already-ingested match (any source) whose team pair + date could plausibly be the same real fixture as `candidate`. Exported for direct unit testing — this is the correctness-critical piece deciding whether a fixture gets duplicated. */
export function findCoveringMatches(candidate: Candidate, allMatches: MatchRow[]): MatchRow[] {
  if (candidate.homeTeamId === null && candidate.awayTeamId === null) return [];

  const candidateDate = toBrtCalendarDate(candidate.kickoffUtc);
  return allMatches.filter((match) => {
    const sameOrder = teamMatches(candidate.homeTeamId, match.homeTeamId) && teamMatches(candidate.awayTeamId, match.awayTeamId);
    const swappedOrder = teamMatches(candidate.homeTeamId, match.awayTeamId) && teamMatches(candidate.awayTeamId, match.homeTeamId);
    if (!sameOrder && !swappedOrder) return false;
    return daysBetween(toBrtCalendarDate(match.kickoffUtc), candidateDate) <= DATE_TOLERANCE_DAYS;
  });
}

/**
 * Supplementary FIXTURE source for the "Europa" division — genuinely
 * different in kind from every other source added this session, which
 * only ever attach a broadcast to a match ge.globo already created. 16 of
 * the 20 tracked European clubs have no ge.globo agenda page at all, so
 * their only fixture data comes from ge-globo-round's current-round hub —
 * exactly ONE match, which vanishes from "upcoming" the moment it kicks
 * off (confirmed live: Bayern de Munique showed 0 upcoming matches, Milan
 * and PSG too, right after their one known match passed). OneFootball's
 * own competition pages server-render several rounds ahead in one fetch,
 * so this creates match rows of its own to fill that gap — but ge.globo
 * remains the preferred source wherever it has data (real broadcast
 * confirmation, ge.globo's own crest pipeline, etc.), so this is careful
 * to never coexist with a non-OneFootball row for the same real fixture:
 *
 * - A candidate covered by some OTHER source's match: never inserted, and
 *   any of THIS source's own now-redundant row(s) for that same fixture
 *   get deleted — self-healing, so a fixture OneFootball found first stops
 *   duplicating once ge.globo's own round-hub later catches up to it (as
 *   it eventually will, once that round becomes "current").
 * - A candidate covered only by this source's own earlier row (or none at
 *   all): upserted normally, same as any other fixture adapter.
 *
 * Deliberately NOT registered as a FixtureSourceAdapter / in
 * sources/registry.ts — that generic pipeline (see ingest/pipeline.ts) has
 * no concept of "matches ge.globo already knows about," which this needs
 * to read before deciding whether to write. Reuses runBroadcastSource
 * purely for its generic "run safely, record a scrape_runs row either
 * way" behavior — nothing broadcast-specific about it despite the name.
 */
export async function runOnefootballEnrichment(): Promise<void> {
  const startedAt = new Date().toISOString();

  await runBroadcastSource(SOURCE_ID, async () => {
    let unresolvedCount = 0;
    let insertedCount = 0;
    let deletedCount = 0;

    for (const competition of COMPETITIONS) {
      let cards: RoundMatchCard[];
      try {
        cards = await fetchCompetitionMatchCards(competition.slug);
      } catch (error) {
        console.error(`[${SOURCE_ID}] failed to fetch competition ${competition.slug}:`, getErrorMessage(error));
        unresolvedCount++;
        continue;
      }

      // Re-read on every competition, not once up front — this loop can
      // both insert and delete matches rows, and a later competition's own
      // dedup check needs to see what an earlier one in this same run just
      // did (unlikely to matter across different leagues in practice, but
      // cheap to get right rather than assume).
      const allMatches: MatchRow[] = await db.select().from(matches);

      for (const { card, round } of cards) {
        const candidate: Candidate = {
          homeTeamId: resolveTeamId(card.homeTeam.name),
          awayTeamId: resolveTeamId(card.awayTeam.name),
          kickoffUtc: card.kickoff,
        };
        if (candidate.homeTeamId === null && candidate.awayTeamId === null) continue; // neither side a team we track — not our concern

        const covering = findCoveringMatches(candidate, allMatches);
        const ownCovering = covering.filter((match) => match.id.startsWith(SOURCE_ID_PREFIX));
        const otherCovering = covering.filter((match) => !match.id.startsWith(SOURCE_ID_PREFIX));

        if (otherCovering.length > 0) {
          // A better source already has this fixture — never duplicate it,
          // and clean up any of our own now-redundant row(s) for it.
          if (ownCovering.length > 0) {
            const [first, ...rest] = ownCovering.map((match) => db.delete(matches).where(eq(matches.id, match.id)));
            await db.batch([first, ...rest]);
            deletedCount += ownCovering.length;
          }
          continue;
        }

        const id = `${SOURCE_ID}:${card.matchId}`;
        const now = new Date().toISOString();
        await db
          .insert(matches)
          .values({
            id,
            competitionId: competition.competitionId,
            homeTeamId: candidate.homeTeamId,
            homeTeamNameRaw: card.homeTeam.name,
            homeTeamCrestUrl: card.homeTeam.imageObject.path,
            awayTeamId: candidate.awayTeamId,
            awayTeamNameRaw: card.awayTeam.name,
            awayTeamCrestUrl: card.awayTeam.imageObject.path,
            kickoffUtc: card.kickoff,
            kickoffTimeConfirmed: true,
            round,
            status: "scheduled",
            sourceId: SOURCE_ID,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: matches.id,
            set: {
              homeTeamCrestUrl: card.homeTeam.imageObject.path,
              awayTeamCrestUrl: card.awayTeam.imageObject.path,
              kickoffUtc: card.kickoff,
              round,
              updatedAt: now,
            },
          });
        insertedCount++;
      }
    }

    await db.insert(scrapeRuns).values({
      sourceId: SOURCE_ID,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: unresolvedCount === 0 ? "ok" : "partial",
      matchesFound: insertedCount,
      matchesUnresolved: unresolvedCount,
    });

    console.log(`[${SOURCE_ID}] upserted ${insertedCount} matches, deleted ${deletedCount} now-redundant (${unresolvedCount} competition fetches failed)`);
  });
}
