import { isYouthCompetitionName, normalizeText, resolveChannelId, slugify } from "@ondevaipassar/shared";
import { db } from "../db/client.js";
import { broadcasts, matches, scrapeRuns } from "../db/schema.js";
import { parseBroadcastChannels } from "../sources/futnatv/broadcastText.js";
import { fetchAllUpcomingGames } from "../sources/futnatv/client.js";
import { runBroadcastSource } from "./attachBroadcasts.js";
import { isTrackedBrazilianFemininoTeam, resolveFemininoTeamId } from "./femininoTeamResolver.js";
import { toKickoffUtc } from "./futnatvEnrichment.js";
import { MANUAL_SOURCE_ID } from "./manualFixtures.js";

const SOURCE_ID = "futnatv-feminino";

interface FemininoCompetition {
  competitionId: string;
  /** True when BOTH sides must resolve to a team we know — see resolveFemininoCompetition. */
  requireBothSides: boolean;
}

/**
 * Women's competitions with a registry entry of their own, matched loosely
 * on futnatv's `competition` string because its wording varies between
 * spellings of the same tournament ("Brasileirão Feminino" / "Campeonato
 * Brasileiro Feminino"). The Libertadores one wasn't observable when this
 * was written — the 2026 edition runs 15-31/out in Ecuador, outside
 * futnatv's roughly one-week-ahead window — so the key tolerates "Copa
 * Libertadores Feminina", "Libertadores Feminina" and the CONMEBOL-branded
 * variants alike.
 *
 * The Brasileirão's pattern is "brasileir" (not "brasil"), which is what
 * keeps "Copa do Brasil Feminina" out of its id: it contains "brasil" but not
 * "brasileir".
 */
const KNOWN_FEMININO_COMPETITIONS: { pattern: RegExp; competition: FemininoCompetition }[] = [
  { pattern: /\bbrasileir/, competition: { competitionId: "brasileirao-feminino", requireBothSides: true } },
  { pattern: /\blibertadores\b/, competition: { competitionId: "libertadores-feminina", requireBothSides: false } },
  // \b is what keeps "Supercopa do Brasil Feminina" out: it contains the
  // text "copa do brasil" too, and a plain substring match filed it under
  // the Copa do Brasil's id — two different tournaments, one competition.
  { pattern: /\bcopa do brasil\b/, competition: { competitionId: "copa-do-brasil-feminina", requireBothSides: false } },
  { pattern: /\bsupercopa do brasil\b/, competition: { competitionId: "supercopa-do-brasil-feminina", requireBothSides: false } },
];

/**
 * Which women's competition a futnatv listing belongs to, or null when it
 * isn't one we'd ingest at all.
 *
 * Open by design — "qualquer campeonato que envolva aqueles times que temos
 * no nosso radar" — so a competition with no registry entry yet still gets
 * ingested under a stopgap slug id instead of being dropped, the same
 * contract competitionResolver.ts gives the men's side. What keeps that
 * from ingesting every women's fixture on the planet is the team rule in
 * the loop below: at least one side has to be a Brazilian club we follow.
 *
 * `requireBothSides` is the Brasileirão's: there, every real Série A1 club
 * is tracked, so a name that doesn't resolve is a genuine naming gap worth
 * counting. Everywhere else an unrecognised opponent is the normal case.
 */
export function resolveFemininoCompetition(competition: string): FemininoCompetition | null {
  const normalized = competition.toLowerCase();
  if (!normalized.includes("feminin")) return null;
  // The age-group editions share the senior tournament's name — "Copa
  // Libertadores Feminina Sub-20" contains "libertadores" and "feminina"
  // alike. Without this, an under-20 tie would be ingested as a senior one
  // between the same two clubs, which is the exact bug already fixed once
  // on the men's side (Youth League attached to Champions League).
  if (isYouthCompetitionName(competition)) return null;
  const known = KNOWN_FEMININO_COMPETITIONS.find(({ pattern }) => pattern.test(normalized));
  return known?.competition ?? { competitionId: slugify(competition), requireBothSides: false };
}

// futnatv publishes a placeholder listing for an upcoming Feminino fixture
// — team names suffixed " F", broadcast field always empty — under a
// DIFFERENT (and often wrong) date, alongside the real listing (bare team
// names, real broadcast text) under the correct date. Confirmed live: on
// 2026-08-30 futnatv listed all 4 Brasileirão Feminino quarterfinal ties as
// "X F x Y F" with blank broadcasts, while the real ge.globo-confirmed
// dates for those same 4 ties were split across 2026-08-29 and 2026-08-31
// — cross-checked against ge.globo's own "onde assistir" article for this
// round. A same-team-pair-within-1-day dedup (this module's earlier
// approach) can't tell which of the two listings is real and sometimes
// kept the wrong one; checking for the " F" suffix directly is exact.
const PLACEHOLDER_SUFFIX_PATTERN = /\sF$/;

function isPlaceholderListing(game: { home: string; away: string }): boolean {
  return PLACEHOLDER_SUFFIX_PATTERN.test(game.home) || PLACEHOLDER_SUFFIX_PATTERN.test(game.away);
}

interface ResolvedMatch {
  matchId: string;
  competitionId: string;
  /** Null for an opponent we don't track — see the untracked-side rule in the loop below. */
  homeTeamId: string | null;
  homeTeamNameRaw: string;
  awayTeamId: string | null;
  awayTeamNameRaw: string;
  kickoffUtc: string;
  /** True when this listing landed on a hand-seeded row (see manualFixtures.ts): its team names are placeholders, and this live source is the one that knows the real ones. */
  refreshTeams: boolean;
}

interface ResolvedBroadcast {
  matchId: string;
  channelId: string;
  watchUrl: string | null;
  regionalDetail: string | null;
}

export interface KnownMatch {
  id: string;
  competitionId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  kickoffUtc: string;
  sourceId: string;
}

// A club plays at most once a day in a competition, so "same competition,
// same tracked club, within a day" is the same game even when two sources
// disagree about which side is home (a neutral-venue tournament lists it
// either way round) or can't name the opponent yet.
const SAME_GAME_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The already-known row this listing is really about, if any. Needed
 * because the Libertadores Feminina fixtures are seeded by hand before
 * futnatv lists them (manualFixtures.ts), and ids can't line up across
 * sources — the opponent may be a placeholder one side and a real club the
 * other, and the home/away order may differ. Without this the same game
 * would be on the site twice.
 *
 * Only ever matches on a TRACKED Brazilian club: that's the guarantee that
 * two different games can't be mistaken for one. Two foreign clubs
 * (Colo-Colo x Caracas) have no such anchor and never match here.
 */
export function findKnownMatch(
  known: KnownMatch[],
  candidate: { competitionId: string; homeTeamId: string | null; awayTeamId: string | null; kickoffUtc: string },
): KnownMatch | undefined {
  const trackedIds = [candidate.homeTeamId, candidate.awayTeamId].filter(
    (id): id is string => id !== null && isTrackedBrazilianFemininoTeam(id),
  );
  if (trackedIds.length === 0) return undefined;
  const at = Date.parse(candidate.kickoffUtc);
  return known.find(
    (match) =>
      match.competitionId === candidate.competitionId &&
      Math.abs(Date.parse(match.kickoffUtc) - at) <= SAME_GAME_WINDOW_MS &&
      trackedIds.some((id) => match.homeTeamId === id || match.awayTeamId === id),
  );
}

/**
 * Supplementary FIXTURE source for women's football — genuinely different
 * in kind from runFutnatvEnrichment (the men's-only broadcast enrichment in
 * this same source): futnatv is currently the ONLY live source this project
 * has for these competitions at all, so this both CREATES match rows and
 * attaches their broadcasts from the same fetch, instead of only enriching
 * matches some other adapter already created (there is no other adapter for
 * these competitions to enrich).
 *
 * Every team resolved here goes through femininoTeamResolver.ts's own
 * dedicated resolveFemininoTeamId, never teamResolver.ts's resolveTeamId —
 * see that module's doc comment for why a shared resolver would be unsafe
 * (real name collisions with tracked men's clubs, e.g. "Flamengo").
 *
 * Deliberately NOT registered as a FixtureSourceAdapter / in
 * sources/registry.ts, same reasoning as onefootballEnrichment.ts: this
 * needs its own bespoke id/upsert shape (there's no per-team agenda page to
 * mirror), and reuses runBroadcastSource purely for its generic "run
 * safely, record a scrape_runs row either way" behavior.
 */
export async function runFemininoEnrichment(): Promise<void> {
  const startedAt = new Date().toISOString();

  await runBroadcastSource(SOURCE_ID, async () => {
    const datedGames = await fetchAllUpcomingGames();

    // Every row already in the table, loaded once: findKnownMatch needs to
    // see the hand-seeded fixtures AND whatever this same run adds below, so
    // a game futnatv lists twice still collapses to one row.
    const known: KnownMatch[] = await db
      .select({
        id: matches.id,
        competitionId: matches.competitionId,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        kickoffUtc: matches.kickoffUtc,
        sourceId: matches.sourceId,
      })
      .from(matches);

    const resolvedMatches: ResolvedMatch[] = [];
    const resolvedBroadcasts: ResolvedBroadcast[] = [];
    let unresolvedCount = 0;

    for (const { game, dateKey } of datedGames) {
      const competition = resolveFemininoCompetition(game.competition);
      if (!competition) continue; // a different competition (or a different sport/league entirely) — not our concern
      if (isPlaceholderListing(game)) continue; // futnatv's own draft listing, real one arrives separately — not counted as unresolved, this is expected

      const kickoffUtc = toKickoffUtc(dateKey, game.time);
      if (!kickoffUtc) {
        unresolvedCount++;
        continue;
      }

      const homeTeamId = resolveFemininoTeamId(game.home);
      const awayTeamId = resolveFemininoTeamId(game.away);

      if (competition.requireBothSides) {
        // The Brasileirão: every Série A1 club is tracked, so an unresolved
        // side is a genuine gap (a naming variant the resolver doesn't know
        // yet), not an untracked-opponent case.
        if (!homeTeamId || !awayTeamId) {
          unresolvedCount++;
          continue;
        }
      } else if (!isTrackedBrazilianFemininoTeam(homeTeamId) && !isTrackedBrazilianFemininoTeam(awayTeamId)) {
        // No club we follow is in this game — Colo-Colo x Caracas, or a
        // friendly between two national teams. Not what this site is for, so
        // skipped silently. Counted as unresolved only when NEITHER side was
        // even recognised, the one shape that could be a real naming gap.
        if (!homeTeamId && !awayTeamId) unresolvedCount++;
        continue;
      }

      // The opponent we don't track rides along by its raw name — same
      // contract as the men's untracked-opponent path (teamResolver.ts).
      const covering = findKnownMatch(known, { competitionId: competition.competitionId, homeTeamId, awayTeamId, kickoffUtc });
      // Falls back to the raw name so the id stays stable across runs for an
      // untracked side — same assumption the dateKey part already makes
      // about futnatv's own listing being consistent day to day.
      const idPart = (teamId: string | null, rawName: string): string =>
        teamId ?? normalizeText(rawName).replace(/\s+/g, "-");
      const matchId =
        covering?.id ?? `${SOURCE_ID}:${idPart(homeTeamId, game.home)}__${idPart(awayTeamId, game.away)}__${dateKey}`;

      resolvedMatches.push({
        matchId,
        competitionId: competition.competitionId,
        homeTeamId,
        homeTeamNameRaw: game.home,
        awayTeamId,
        awayTeamNameRaw: game.away,
        kickoffUtc,
        refreshTeams: covering?.sourceId === MANUAL_SOURCE_ID,
      });
      if (!covering) {
        known.push({
          id: matchId,
          competitionId: competition.competitionId,
          homeTeamId,
          awayTeamId,
          kickoffUtc,
          sourceId: SOURCE_ID,
        });
      }

      const byChannelId = new Map<string, { watchUrl: string | null; regionalDetail: string | null }>();
      for (const { channelNameRaw, watchUrl, regionalDetail } of parseBroadcastChannels(game.broadcast, game.youtubeUrl ?? null)) {
        const channelId = resolveChannelId(channelNameRaw);
        if (!channelId) continue;
        const existing = byChannelId.get(channelId);
        if (existing === undefined || (!existing.watchUrl && watchUrl) || (!existing.regionalDetail && regionalDetail)) {
          byChannelId.set(channelId, {
            watchUrl: watchUrl ?? existing?.watchUrl ?? null,
            regionalDetail: regionalDetail ?? existing?.regionalDetail ?? null,
          });
        }
      }
      for (const [channelId, { watchUrl, regionalDetail }] of byChannelId) {
        resolvedBroadcasts.push({ matchId, channelId, watchUrl, regionalDetail });
      }
    }

    const now = new Date().toISOString();

    const matchUpserts = resolvedMatches.map(
      ({ matchId, competitionId, homeTeamId, homeTeamNameRaw, awayTeamId, awayTeamNameRaw, kickoffUtc, refreshTeams }) =>
        db
          .insert(matches)
          .values({
            id: matchId,
            competitionId,
            homeTeamId,
            homeTeamNameRaw,
            homeTeamCrestUrl: "",
            awayTeamId,
            awayTeamNameRaw,
            awayTeamCrestUrl: "",
            kickoffUtc,
            kickoffTimeConfirmed: true,
            round: null,
            status: "scheduled",
            sourceId: SOURCE_ID,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: matches.id,
            // A hand-seeded row carries a placeholder opponent ("Representante
            // da Colômbia") and a snapshot of the schedule; this live source
            // replaces both the moment it knows better. Anything else keeps
            // its teams and only takes a corrected kickoff, as before.
            set: refreshTeams
              ? { kickoffUtc, homeTeamId, homeTeamNameRaw, awayTeamId, awayTeamNameRaw, updatedAt: now }
              : { kickoffUtc, updatedAt: now },
          }),
    );

    // Same onConflictDoUpdate-only-when-there's-something-new pattern as
    // futnatvEnrichment.ts's own broadcast upserts, and the same reason: a
    // plain onConflictDoNothing would silently never attach a field this
    // run actually has, once the row already exists from an earlier day's
    // fetch of the same fixture.
    const broadcastUpserts = resolvedBroadcasts.map(({ matchId, channelId, watchUrl, regionalDetail }) => {
      const insert = db
        .insert(broadcasts)
        .values({ id: `${matchId}__${channelId}`, matchId, channelId, logoUrl: "", watchUrl, regionalDetail, sourceId: SOURCE_ID, createdAt: now });

      // watchUrl only when we have one: other sources write that same field
      // on this same row (youtube enrichment, see attachBroadcasts.ts), and
      // clearing theirs would lose a working link.
      //
      // regionalDetail ALWAYS, null included: this enrichment and its
      // Feminino twin are the only writers of that field, and they cover
      // disjoint matches, so each is the sole authority on the rows it
      // touches. Skipping the null left a broadcast that STOPPED being
      // regional carrying its old state list forever — the site would go on
      // naming states for a match that now airs nationwide.
      const updateFields: { watchUrl?: string; regionalDetail: string | null } = { regionalDetail };
      if (watchUrl) updateFields.watchUrl = watchUrl;

      return insert.onConflictDoUpdate({ target: broadcasts.id, set: updateFields });
    });

    const upserts = [...matchUpserts, ...broadcastUpserts];
    if (upserts.length > 0) {
      const [first, ...rest] = upserts;
      await db.batch([first, ...rest]);
    }

    await db.insert(scrapeRuns).values({
      sourceId: SOURCE_ID,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: unresolvedCount === 0 ? "ok" : "partial",
      matchesFound: resolvedMatches.length,
      matchesUnresolved: unresolvedCount,
    });

    console.log(`[${SOURCE_ID}] upserted ${resolvedMatches.length} matches, ${resolvedBroadcasts.length} channel mentions (${unresolvedCount} unresolved)`);
  });
}
