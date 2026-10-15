import { resolveChannelId } from "@ondevaipassar/shared";
import { db } from "../db/client.js";
import { broadcasts, matches, scrapeRuns } from "../db/schema.js";
import { getErrorMessage } from "../lib/errors.js";
import { fetchText } from "../http/client.js";
import { parseWomensArticle } from "../sources/ge-globo/womensArticle.js";
import { runBroadcastSource } from "./attachBroadcasts.js";
import { MANUAL_SOURCE_ID } from "./manualFixtures.js";
import { staleBroadcastDeletes } from "./staleOwnedBroadcasts.js";
import { decideListing, findKnownMatch, resolveFemininoCompetition, resolveNationalFemininoCompetition } from "./femininoEnrichment.js";
import { resolveFemininoTeamId } from "./femininoTeamResolver.js";
import { normalizeText } from "@ondevaipassar/shared";

const SOURCE_ID = "ge-globo-feminino";
const CONCURRENCY = 5;

/** Only previews from the last two days are fetched: older ones are about games already played. */
const MAX_AGE_DAYS = 2;
const URL_DATE_PATTERN = /\/noticia\/(\d{4})\/(\d{2})\/(\d{2})\//;

export interface WomensCandidate {
  title: string;
  url: string;
}

function isRecent(url: string, now: Date): boolean {
  const match = url.match(URL_DATE_PATTERN);
  if (!match) return false;
  const published = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return now.getTime() - published <= MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

/** The kickoff's date in Brasília (UTC-3), for the stable match id. */
function brasiliaDateKey(kickoffUtc: string): string {
  return new Date(Date.parse(kickoffUtc) - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * ge.globo's own "onde assistir" previews for women's club games, as a second
 * source beside futnatv: the one list we had missed games it never carried
 * (and Copa do Brasil Feminina entirely, until its "F" suffix rule was fixed).
 * The article gives teams, tournament, kickoff and channels, so — unlike the
 * men's preview scan, which only attaches a channel to a game we already know —
 * this one can create the game.
 *
 * A game futnatv already put in the table is never duplicated (same
 * findKnownMatch rule futnatv's own run uses); it only gets the channels.
 */
export async function runGeFemininoEnrichment(candidates: WomensCandidate[], now: Date = new Date()): Promise<void> {
  const startedAt = new Date().toISOString();

  await runBroadcastSource(SOURCE_ID, async () => {
    const urls = new Set<string>();
    const recent = candidates.filter((candidate) => isRecent(candidate.url, now) && !urls.has(candidate.url) && urls.add(candidate.url));

    const known = (await db.select().from(matches)).map((row) => ({
      id: row.id,
      competitionId: row.competitionId,
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      kickoffUtc: row.kickoffUtc,
      sourceId: row.sourceId,
    }));

    let unresolvedCount = 0;
    const newMatches: { id: string; competitionId: string; homeTeamId: string | null; homeName: string; awayTeamId: string | null; awayName: string; kickoffUtc: string }[] = [];
    const attached: { matchId: string; channelIds: string[] }[] = [];
    // Hand-seeded games whose article lists the channels: the article is the truth for them (see below).
    const seededClaims: { matchId: string; channelId: string }[] = [];
    const kickoffByMatchId = new Map<string, string>();

    for (let i = 0; i < recent.length; i += CONCURRENCY) {
      const batch = recent.slice(i, i + CONCURRENCY);
      const parsed = await Promise.all(
        batch.map(async (candidate) => {
          try {
            return { candidate, game: parseWomensArticle(await fetchText(candidate.url), candidate.url) };
          } catch (error) {
            console.error(`[${SOURCE_ID}] failed to fetch ${candidate.url}:`, getErrorMessage(error));
            return { candidate, game: null };
          }
        }),
      );

      for (const { candidate, game } of parsed) {
        if (!game) {
          unresolvedCount++;
          continue;
        }
        // National-team friendlies and qualifiers come from the other women's sources.
        if (resolveNationalFemininoCompetition(`${game.competitionName} feminina ${candidate.title}`)) continue;
        const competition = resolveFemininoCompetition(`${game.competitionName} feminina`);
        if (!competition || !game.competitionName) continue;

        const homeTeamId = resolveFemininoTeamId(game.homeTeamNameRaw);
        const awayTeamId = resolveFemininoTeamId(game.awayTeamNameRaw);
        if (decideListing(competition.requireBothSides, homeTeamId, awayTeamId) !== "ingest") continue;

        const covering = findKnownMatch(known, { competitionId: competition.competitionId, homeTeamId, awayTeamId, kickoffUtc: game.kickoffUtc });
        const part = (teamId: string | null, name: string): string => teamId ?? normalizeText(name).replace(/\s+/g, "-");
        const matchId = covering?.id ?? `${SOURCE_ID}:${part(homeTeamId, game.homeTeamNameRaw)}__${part(awayTeamId, game.awayTeamNameRaw)}__${brasiliaDateKey(game.kickoffUtc)}`;

        if (!covering && !known.some((row) => row.id === matchId)) {
          newMatches.push({ id: matchId, competitionId: competition.competitionId, homeTeamId, homeName: game.homeTeamNameRaw, awayTeamId, awayName: game.awayTeamNameRaw, kickoffUtc: game.kickoffUtc });
          known.push({ id: matchId, competitionId: competition.competitionId, homeTeamId, awayTeamId, kickoffUtc: game.kickoffUtc, sourceId: SOURCE_ID });
        }
        if (game.channelIds.length > 0) attached.push({ matchId, channelIds: game.channelIds });
        // A seeded fixture (manualFixtures.ts) carries channels announced weeks ahead for "every game"
        // ("Todos os jogos serão no Canal GOAT"). The day-of article names what is really airing, so a
        // seeded channel it leaves out goes: that is how GOAT stayed on a game it was not showing.
        if (covering?.sourceId === MANUAL_SOURCE_ID && game.channelIds.length > 0) {
          kickoffByMatchId.set(covering.id, covering.kickoffUtc);
          for (const channelId of game.channelIds) seededClaims.push({ matchId: covering.id, channelId });
        }
      }
    }

    const nowIso = new Date().toISOString();
    const seededDeletes = await staleBroadcastDeletes(MANUAL_SOURCE_ID, seededClaims, kickoffByMatchId);
    const writes = [
      ...seededDeletes,
      ...newMatches.map((match) =>
        db
          .insert(matches)
          .values({
            id: match.id,
            competitionId: match.competitionId,
            homeTeamId: match.homeTeamId,
            homeTeamNameRaw: match.homeName,
            homeTeamCrestUrl: "",
            awayTeamId: match.awayTeamId,
            awayTeamNameRaw: match.awayName,
            awayTeamCrestUrl: "",
            kickoffUtc: match.kickoffUtc,
            kickoffTimeConfirmed: true,
            round: null,
            status: "scheduled",
            sourceId: SOURCE_ID,
            createdAt: nowIso,
            updatedAt: nowIso,
          })
          .onConflictDoUpdate({ target: matches.id, set: { kickoffUtc: match.kickoffUtc, updatedAt: nowIso } }),
      ),
      ...attached.flatMap(({ matchId, channelIds }) =>
        channelIds.map((channelId) =>
          db
            .insert(broadcasts)
            .values({ id: `${matchId}__${channelId}`, matchId, channelId, logoUrl: "", sourceId: SOURCE_ID, createdAt: nowIso })
            .onConflictDoNothing({ target: broadcasts.id }),
        ),
      ),
    ];
    if (writes.length > 0) {
      const [first, ...rest] = writes;
      await db.batch([first, ...rest]);
    }

    await db.insert(scrapeRuns).values({
      sourceId: SOURCE_ID,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: unresolvedCount === 0 ? "ok" : "partial",
      matchesFound: newMatches.length,
      matchesUnresolved: unresolvedCount,
    });
    console.log(`[${SOURCE_ID}] created ${newMatches.length} matches, channels for ${attached.length} (${unresolvedCount} unreadable)`);
  });
}
