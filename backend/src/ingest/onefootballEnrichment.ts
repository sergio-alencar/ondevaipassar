import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { broadcasts, matches, scrapeRuns } from "../db/schema.js";
import { getErrorMessage } from "../lib/errors.js";
import { fetchCompetitionMatchCards, fetchTeamMatchCards, type RoundMatchCard } from "../sources/onefootball/client.js";
import type { MatchCard } from "../sources/onefootball/schema.js";
import { resolveCompetitionId } from "./competitionResolver.js";
import { runBroadcastSource } from "./attachBroadcasts.js";
import { resolveTeamId } from "./teamResolver.js";
import { normalizeText } from "@ondevaipassar/shared";

const SOURCE_ID = "onefootball";
const SOURCE_ID_PREFIX = `${SOURCE_ID}:`;
// See schema.ts's own doc comment on ottStreamType for how this value was
// identified — only value observed sitting next to the page's "Assista"
// button markup.
const STREAMABLE_OTT_TYPE = 2;
// Same 1-day tolerance as broadcastMatching.ts, and the same reasoning:
// absorbs a BRT-kickoff-crossing-midnight-UTC rollover without risking a
// same-pair-rematch (e.g. a two-legged tie) matching the wrong leg.
const DATE_TOLERANCE_DAYS = 1;

// Same 5 competitions as ge-globo-round's own European HUB_SOURCES — every
// slug verified live (page title matches the competition, not a guess:
// several plausible-looking slugs silently served Bundesliga's own content
// instead of 404ing, confirmed live against "ligue-1" specifically, so
// only slugs pulled from a real page's own links to itself were trusted).
const COMPETITIONS: { slug: string; competitionId: string; fullCoverage?: boolean }[] = [
  { slug: "premier-league-9", competitionId: "premier-league" },
  { slug: "laliga-10", competitionId: "la-liga" },
  { slug: "bundesliga-1", competitionId: "bundesliga" },
  { slug: "ligue-1-23", competitionId: "ligue-1" },
  { slug: "serie-a-13", competitionId: "serie-a-italiana" },
  // Domestic Séries A/B/C — every team in these is already richly covered
  // by ge.globo's own per-team agenda (unlike Europa, where 16/20 clubs
  // have none), so this mostly won't create new rows here; its real value
  // domestically is the same kickoff-time backfill described above, plus a
  // safety net for the rare gap ge.globo's own sources miss (confirmed
  // real earlier this session: Athletic x Chapecoense, Novorizontino x
  // Sport — both teams lacking a working agenda page at the time).
  { slug: "brasileirao-betano-16", competitionId: "brasileirao-serie-a" },
  { slug: "brasileirao-serie-b-superbet-119", competitionId: "brasileirao-serie-b" },
  { slug: "brasileirao-serie-c-195", competitionId: "brasileirao-serie-c" },
  // Ingested WHOLE, unlike everything above: every match enters, including
  // the ones where neither club is tracked. Sérgio's reasoning, and it's
  // right — Fenerbahçe x Roma draws a Brazilian audience without either
  // club being one of the 20 we follow, and hand-maintaining a club list
  // can't keep up with a 36-team Champions League that reshuffles yearly.
  // The five domestic European leagues stay tracked-clubs-only: those are
  // followed for the clubs, not for the competition.
  //
  // Both slugs came from a real match page's own link to its competition,
  // never guessed — and guessing here is genuinely dangerous:
  // "champions-league-12" returns HTTP 200 and quietly serves the World
  // Cup, because only the trailing number is real.
  { slug: "uefa-liga-dos-campeoes-5", competitionId: "champions-league", fullCoverage: true },
  { slug: "uefa-liga-europa-7", competitionId: "europa-league", fullCoverage: true },
];

/**
 * OneFootball's own numeric club ids for the 20 tracked European clubs.
 * Every id was verified live against the served page's own <title> ("Jogos
 * do Bayern de Munique") — necessary, not paranoid: the club's name in the
 * URL is decorative, so a wrong id quietly returns a DIFFERENT club's
 * fixtures with a 200 and no other signal (see fetchTeamMatchCards).
 *
 * These pages are what brings in the cups: a competition page only ever
 * covers its own league, so before this the tracked European clubs showed
 * league fixtures only — no Champions League, no Liga Europa, no domestic
 * cup. Confirmed live across all 20: Premier League, Serie A, LaLiga,
 * Bundesliga, Ligue 1, UEFA Liga dos Campeões, UEFA Liga Europa, EFL Cup
 * and DFB-Pokal all appear.
 */
const TRACKED_EUROPEAN_TEAMS: { teamId: string; onefootballId: string }[] = [
  { teamId: "arsenal", onefootballId: "2" },
  { teamId: "aston_villa", onefootballId: "199" },
  { teamId: "atletico_madrid", onefootballId: "3" },
  { teamId: "barcelona", onefootballId: "5" },
  { teamId: "bayer_leverkusen", onefootballId: "162" },
  { teamId: "bayern_munique", onefootballId: "6" },
  { teamId: "borussia_dortmund", onefootballId: "155" },
  { teamId: "chelsea", onefootballId: "9" },
  { teamId: "inter_de_milao", onefootballId: "16" },
  { teamId: "juventus", onefootballId: "17" },
  { teamId: "liverpool", onefootballId: "18" },
  { teamId: "manchester_city", onefootballId: "209" },
  { teamId: "manchester_united", onefootballId: "21" },
  { teamId: "milan", onefootballId: "23" },
  { teamId: "napoli", onefootballId: "191" },
  { teamId: "newcastle", onefootballId: "207" },
  { teamId: "nottingham_forest", onefootballId: "577" },
  { teamId: "paris_saint_germain", onefootballId: "263" },
  { teamId: "real_madrid", onefootballId: "26" },
  { teamId: "tottenham", onefootballId: "202" },
];

// Enough to cut the wall-clock cost without hammering onefootball.com with
// all 30 pages at once.
const FETCH_CONCURRENCY = 6;

/** Runs `task` over every item with at most `limit` in flight, returning results in the input's order. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** One page to scrape, plus how to tell which competition each of its cards belongs to. */
interface PageSource {
  label: string;
  fetch: () => Promise<RoundMatchCard[]>;
  /** null means "can't tell" — the card is skipped rather than filed under a guess. */
  competitionIdFor: (card: MatchCard) => string | null;
  /** Take every match on this page, even one where neither club is tracked. */
  fullCoverage: boolean;
}

function buildPageSources(): PageSource[] {
  return [
    ...COMPETITIONS.map((competition) => ({
      label: `competição ${competition.slug}`,
      fetch: () => fetchCompetitionMatchCards(competition.slug),
      // A competition page is one competition throughout; its cards carry
      // an empty competitionName.
      competitionIdFor: () => competition.competitionId,
      fullCoverage: competition.fullCoverage === true,
    })),
    ...TRACKED_EUROPEAN_TEAMS.map((team) => ({
      label: `time ${team.teamId}`,
      fetch: () => fetchTeamMatchCards(team.onefootballId),
      competitionIdFor: (card: MatchCard) =>
        card.competitionName ? resolveCompetitionId(card.competitionName) : null,
      // A team page is fetched *because* of the club on it, so a match with
      // no tracked side there would be a resolver failure, not a fixture
      // we want.
      fullCoverage: false,
    })),
  ];
}

export interface Candidate {
  homeTeamId: string | null;
  awayTeamId: string | null;
  /** Needed to dedup a fixture where NEITHER club is tracked — the ids are both null there, so they can't tell two different matches apart. */
  homeTeamNameRaw: string;
  awayTeamNameRaw: string;
  kickoffUtc: string;
}

export interface MatchRow {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamNameRaw: string;
  awayTeamNameRaw: string;
  kickoffUtc: string;
  kickoffTimeConfirmed: boolean;
  round: number | null;
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

function namesMatch(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b);
}

/**
 * Every already-ingested match (any source) whose team pair + date could
 * plausibly be the same real fixture as `candidate`. Exported for direct
 * unit testing — this is the correctness-critical piece deciding whether a
 * fixture gets duplicated.
 *
 * Two regimes, because a null team id means different things depending on
 * how many of them there are:
 *
 * - At least one side tracked: a null on the OTHER side is a wildcard
 *   ("some untracked opponent"), which is what lets a ge.globo row with an
 *   unnamed opponent still be recognised as the same fixture.
 * - Neither side tracked: wildcards on both sides would match every match
 *   that day, so the raw names are compared instead. This regime only
 *   exists because the European cups are now ingested whole (see
 *   FULL_COVERAGE_COMPETITIONS), which is the first time fixtures with two
 *   untracked clubs get created at all.
 */
export function findCoveringMatches(candidate: Candidate, allMatches: MatchRow[]): MatchRow[] {
  const candidateDate = toBrtCalendarDate(candidate.kickoffUtc);
  const withinTolerance = (match: MatchRow): boolean =>
    daysBetween(toBrtCalendarDate(match.kickoffUtc), candidateDate) <= DATE_TOLERANCE_DAYS;

  if (candidate.homeTeamId === null && candidate.awayTeamId === null) {
    return allMatches.filter((match) => {
      const sameOrder =
        namesMatch(candidate.homeTeamNameRaw, match.homeTeamNameRaw) &&
        namesMatch(candidate.awayTeamNameRaw, match.awayTeamNameRaw);
      const swappedOrder =
        namesMatch(candidate.homeTeamNameRaw, match.awayTeamNameRaw) &&
        namesMatch(candidate.awayTeamNameRaw, match.homeTeamNameRaw);
      return (sameOrder || swappedOrder) && withinTolerance(match);
    });
  }

  return allMatches.filter((match) => {
    const sameOrder = teamMatches(candidate.homeTeamId, match.homeTeamId) && teamMatches(candidate.awayTeamId, match.awayTeamId);
    const swappedOrder = teamMatches(candidate.homeTeamId, match.awayTeamId) && teamMatches(candidate.awayTeamId, match.homeTeamId);
    if (!sameOrder && !swappedOrder) return false;
    return withinTolerance(match);
  });
}

/**
 * Which of `coveringMatches` (from some OTHER source) should get
 * `candidate`'s own kickoff time backfilled onto them — see
 * runOnefootballEnrichment's own doc comment for the full reasoning.
 * Exported for direct unit testing, same as findCoveringMatches: the
 * same-BRT-day requirement (stricter than findCoveringMatches's own
 * ±1-day tolerance) is the one thing standing between this safely filling
 * a gap and silently moving a match to the wrong day.
 */
export function findBackfillTargets(candidate: Candidate, coveringMatches: MatchRow[]): MatchRow[] {
  const candidateDate = toBrtCalendarDate(candidate.kickoffUtc);
  return coveringMatches.filter(
    (match) => !match.kickoffTimeConfirmed && daysBetween(toBrtCalendarDate(match.kickoffUtc), candidateDate) === 0,
  );
}

/**
 * Upserts a "onefootball" broadcast row onto every match id in
 * `matchIds` — usually one, but `otherCovering` (an already-ingested match
 * from some other source) is a filtered `allMatches`, which itself has no
 * uniqueness guarantee beyond "same team pair, within a day," so this stays
 * plural rather than assuming exactly one. No local `logoUrl` yet (same
 * empty-string convention as every other source with no per-run avatar
 * fetch, e.g. futnatvEnrichment.ts) — falls back to local static art if/when
 * that's added under images/canais/onefootball.*. Returns how many rows it
 * touched, for the caller's own summary log.
 */
async function attachOnefootballBroadcasts(matchIds: string[], sourceMatchId: string): Promise<number> {
  if (matchIds.length === 0) return 0;

  const now = new Date().toISOString();
  const watchUrl = `https://onefootball.com/pt-br/match/${sourceMatchId}`;
  const upserts = matchIds.map((matchId) =>
    db
      .insert(broadcasts)
      .values({ id: `${matchId}__${SOURCE_ID}`, matchId, channelId: SOURCE_ID, logoUrl: "", watchUrl, sourceId: SOURCE_ID, createdAt: now })
      .onConflictDoUpdate({ target: broadcasts.id, set: { watchUrl } }),
  );
  const [first, ...rest] = upserts;
  await db.batch([first, ...rest]);
  return matchIds.length;
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
 * Also backfills a specific kickoff time onto a covering match from
 * ANOTHER source when that match only has a "date confirmed, exact time
 * not yet" placeholder (kickoffTimeConfirmed: false — a real, common state
 * for a match still weeks out even on a team's own rich ge.globo agenda;
 * Sérgio asked for this specifically, having noticed a lot of "horário a
 * confirmar" in the Europa division). Deliberately conservative: only when
 * OneFootball's own date agrees with the existing placeholder's date (same
 * BRT calendar day, not just within the usual ±1-day matching tolerance) —
 * a real discrepancy was found live between OneFootball and an existing
 * ge.globo-sourced date for the same fixture (a full day apart, not just
 * an hours-level rounding difference), so this never lets OneFootball's
 * own date silently override which DAY a match is already believed to be
 * on, only fills in a time-of-day gap on a day both sources already agree on.
 *
 * Deliberately NOT registered as a FixtureSourceAdapter / in
 * sources/registry.ts — that generic pipeline (see ingest/pipeline.ts) has
 * no concept of "matches ge.globo already knows about," which this needs
 * to read before deciding whether to write. Reuses runBroadcastSource
 * purely for its generic "run safely, record a scrape_runs row either
 * way" behavior — nothing broadcast-specific about it despite the name.
 *
 * Also attaches a real "onefootball" broadcast row (see
 * STREAMABLE_OTT_TYPE) to whichever match row ends up representing this
 * fixture — its own newly-created row, or (far more often, since
 * ge.globo/other sources already cover most tracked teams) the existing
 * `otherCovering` match this same card just deduped against. Genuinely new
 * as of 2026-08-31: OneFootball was only ever used here as a fixture
 * backfill before Sérgio pointed out it also streams matches for free
 * (confirmed live for the Bundesliga).
 */
export async function runOnefootballEnrichment(): Promise<void> {
  const startedAt = new Date().toISOString();

  await runBroadcastSource(SOURCE_ID, async () => {
    let unresolvedCount = 0;
    let insertedCount = 0;
    let deletedCount = 0;
    let backfilledCount = 0;
    let broadcastCount = 0;

    // Fetched up front and concurrently, then processed strictly in order.
    // Sequential fetching put this source at ~30s of pure network on its
    // own (a competition page alone takes ~2.3s, and there are 10 of them
    // plus 20 team pages), which pushed the whole cron past its 60s
    // ceiling and cut off everything after it — futnatv, which owns the
    // regional detail, never ran. Only the network moves: the DB reads and
    // writes below stay in the same order, which is what the dedup relies on.
    const fetched = await mapWithConcurrency(buildPageSources(), FETCH_CONCURRENCY, async (page) => {
      try {
        return { page, cards: await page.fetch() };
      } catch (error) {
        console.error(`[${SOURCE_ID}] failed to fetch ${page.label}:`, getErrorMessage(error));
        return { page, cards: null };
      }
    });

    for (const { page, cards } of fetched) {
      if (cards === null) {
        unresolvedCount++;
        continue;
      }

      // Re-read on every page, not once up front — this loop can both
      // insert and delete matches rows, and a later page's own dedup check
      // needs to see what an earlier one in this same run just did. That
      // matters much more now that team pages are in the mix: two clubs
      // playing each other are two pages carrying the same fixture.
      const allMatches: MatchRow[] = await db.select().from(matches);

      for (const { card, round } of cards) {
        const candidate: Candidate = {
          homeTeamId: resolveTeamId(card.homeTeam.name),
          awayTeamId: resolveTeamId(card.awayTeam.name),
          homeTeamNameRaw: card.homeTeam.name,
          awayTeamNameRaw: card.awayTeam.name,
          kickoffUtc: card.kickoff,
        };
        // Neither side tracked: normally not our concern, but a
        // full-coverage competition takes the match anyway (its clubs are
        // the point, not our roster).
        if (candidate.homeTeamId === null && candidate.awayTeamId === null && !page.fullCoverage) continue;

        const competitionId = page.competitionIdFor(card);
        if (competitionId === null) continue; // no competition name on the card — never file it under a guess

        const covering = findCoveringMatches(candidate, allMatches);
        const ownCovering = covering.filter((match) => match.id.startsWith(SOURCE_ID_PREFIX));
        const otherCovering = covering.filter((match) => !match.id.startsWith(SOURCE_ID_PREFIX));
        const id = `${SOURCE_ID}:${card.matchId}`;

        if (otherCovering.length > 0) {
          // A better source already has this fixture — never duplicate it,
          // and clean up any of our own now-redundant row(s) for it.
          if (ownCovering.length > 0) {
            const [first, ...rest] = ownCovering.map((match) => db.delete(matches).where(eq(matches.id, match.id)));
            await db.batch([first, ...rest]);
            deletedCount += ownCovering.length;
          }

          const backfillTargets = findBackfillTargets(candidate, otherCovering);
          if (backfillTargets.length > 0) {
            const now = new Date().toISOString();
            const updates = backfillTargets.map((match) =>
              db
                .update(matches)
                .set({ kickoffUtc: candidate.kickoffUtc, kickoffTimeConfirmed: true, round: match.round ?? round, updatedAt: now })
                .where(eq(matches.id, match.id)),
            );
            const [first, ...rest] = updates;
            await db.batch([first, ...rest]);
            backfilledCount += backfillTargets.length;
          }

          if (card.ottStreamType === STREAMABLE_OTT_TYPE) {
            broadcastCount += await attachOnefootballBroadcasts(
              otherCovering.map((match) => match.id),
              card.matchId,
            );
          }

          continue;
        }

        const now = new Date().toISOString();
        await db
          .insert(matches)
          .values({
            id,
            competitionId,
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

        if (card.ottStreamType === STREAMABLE_OTT_TYPE) {
          broadcastCount += await attachOnefootballBroadcasts([id], card.matchId);
        }
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

    console.log(
      `[${SOURCE_ID}] upserted ${insertedCount} matches, attached ${broadcastCount} broadcasts, backfilled a kickoff time onto ${backfilledCount} existing ones, deleted ${deletedCount} now-redundant (${unresolvedCount} competition fetches failed)`,
    );
  });
}
