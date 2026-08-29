import { resolveChannelId } from "@ondevaipassar/shared";
import { db } from "../db/client.js";
import { broadcasts, matches, scrapeRuns } from "../db/schema.js";
import { parseBroadcastChannels } from "../sources/futnatv/broadcastText.js";
import { fetchAllUpcomingGames } from "../sources/futnatv/client.js";
import { runBroadcastSource } from "./attachBroadcasts.js";
import { resolveFemininoTeamId } from "./femininoTeamResolver.js";
import { toKickoffUtc } from "./futnatvEnrichment.js";

const SOURCE_ID = "futnatv-feminino";
const COMPETITION_ID = "brasileirao-feminino";

// "brasileir" (not "brasil") deliberately excludes "Copa do Brasil
// Feminino" — a real, different competition futnatv also carries under a
// name that also contains "feminin" — while still matching every spelling
// of "Brasileirão"/"Campeonato Brasileiro" seen live for the men's side.
function isBrasileiraoFeminino(competition: string): boolean {
  const normalized = competition.toLowerCase();
  return normalized.includes("brasileir") && normalized.includes("feminin");
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
  homeTeamId: string;
  homeTeamNameRaw: string;
  awayTeamId: string;
  awayTeamNameRaw: string;
  kickoffUtc: string;
}

interface ResolvedBroadcast {
  matchId: string;
  channelId: string;
  watchUrl: string | null;
  regionalDetail: string | null;
}

/**
 * Supplementary FIXTURE source for the Feminino division — genuinely
 * different in kind from runFutnatvEnrichment (the men's-only broadcast
 * enrichment in this same source): futnatv is currently the ONLY source
 * this project has for Brasileirão Feminino at all, so this both CREATES
 * match rows and attaches their broadcasts from the same fetch, instead of
 * only enriching matches some other adapter already created (there is no
 * other adapter for this competition to enrich).
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

    const resolvedMatches: ResolvedMatch[] = [];
    const resolvedBroadcasts: ResolvedBroadcast[] = [];
    let unresolvedCount = 0;

    for (const { game, dateKey } of datedGames) {
      if (!isBrasileiraoFeminino(game.competition)) continue; // a different competition (or a different sport/league entirely) — not our concern
      if (isPlaceholderListing(game)) continue; // futnatv's own draft listing, real one arrives separately — not counted as unresolved, this is expected

      const kickoffUtc = toKickoffUtc(dateKey, game.time);
      if (!kickoffUtc) {
        unresolvedCount++;
        continue;
      }

      const homeTeamId = resolveFemininoTeamId(game.home);
      const awayTeamId = resolveFemininoTeamId(game.away);
      // Unlike the men's side, every real Série A1 club is tracked — an
      // unresolved side here is a genuine gap (a naming variant this
      // resolver doesn't know yet), not an untracked-opponent case.
      if (!homeTeamId || !awayTeamId) {
        unresolvedCount++;
        continue;
      }

      const matchId = `${SOURCE_ID}:${homeTeamId}__${awayTeamId}__${dateKey}`;
      resolvedMatches.push({ matchId, homeTeamId, homeTeamNameRaw: game.home, awayTeamId, awayTeamNameRaw: game.away, kickoffUtc });

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

    const matchUpserts = resolvedMatches.map(({ matchId, homeTeamId, homeTeamNameRaw, awayTeamId, awayTeamNameRaw, kickoffUtc }) =>
      db
        .insert(matches)
        .values({
          id: matchId,
          competitionId: COMPETITION_ID,
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
        .onConflictDoUpdate({ target: matches.id, set: { kickoffUtc, updatedAt: now } }),
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

      const updateFields: { watchUrl?: string; regionalDetail?: string } = {};
      if (watchUrl) updateFields.watchUrl = watchUrl;
      if (regionalDetail) updateFields.regionalDetail = regionalDetail;

      return Object.keys(updateFields).length > 0
        ? insert.onConflictDoUpdate({ target: broadcasts.id, set: updateFields })
        : insert.onConflictDoNothing({ target: broadcasts.id });
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
