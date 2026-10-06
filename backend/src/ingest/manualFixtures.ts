import { db } from "../db/client.js";
import { broadcasts, matches, scrapeRuns } from "../db/schema.js";
import { runBroadcastSource } from "./attachBroadcasts.js";

export const MANUAL_SOURCE_ID = "manual-fixtures";

/**
 * A game, entered by hand from a source that publishes the whole schedule
 * ahead of any feed we scrape. Exists because the Libertadores Feminina
 * (15-31/out/2026, Ecuador) is announced weeks before futnatv — the only
 * live source for women's football here — starts listing it, and "aqui só
 * aparece quando já é tarde" is the problem to avoid, not a feature.
 *
 * Deliberately temporary in spirit: once futnatv lists a game,
 * femininoEnrichment.ts's findKnownMatch folds that listing into this row
 * and its team names, kickoff and channels take over (see refreshTeams
 * there). What's left here is only the head start.
 */
interface ManualFixture {
  competitionId: string;
  homeTeamId: string | null;
  homeTeamNameRaw: string;
  awayTeamId: string | null;
  awayTeamNameRaw: string;
  /** "YYYY-MM-DD", Brasília time. */
  date: string;
  /** "HH:MM", Brasília time — every source below states it that way ("17h (de Brasília)"). */
  time: string;
  /** Channels with a source naming them for THIS game — never a channel that merely holds rights to the competition. */
  channelIds: string[];
}

/**
 * Brasília is UTC-3 with no daylight saving (abolished 2019), so a fixed
 * offset is exact for any date this table will ever hold.
 */
function brasiliaToUtc(date: string, time: string): string {
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}

/**
 * Libertadores Feminina 2026, first phase — only the games with a club this
 * site follows (Corinthians, Palmeiras, Cruzeiro): 9 of the 24. The other 15
 * are Colo-Colo x Caracas and the like, which nobody here is looking for.
 *
 * Schedule: UOL's published calendar (uol.com.br, 19/09/2026), cross-checked
 * against the Pluto TV announcement — all nine agree on date and time, and
 * UOL states the times as Brasília.
 *
 * Channels, each with what actually backs it:
 * - "pluto": the Pluto TV announcement lists all nine of these games as free
 *   on the platform.
 * - "goat": Amstel's official-sponsor page — "Todos os jogos serão
 *   transmitidos no canal da GOAT na Twitch e YouTube".
 * - "uol": UOL — the competition "terá transmissão do Canal UOL".
 * - "tvpalmeiras": Lance, 07/03/2026 — the club's YouTube channel "transmitirá
 *   ao vivo todos os jogos do Verdão". Palmeiras' games ONLY.
 *
 * NOT here, on purpose: Globo, Band/BandSports, SporTV, Paramount and Meu
 * Timão. The Terra piece naming Globo, Band and Paramount is from 25/08/2023,
 * about that year's edition, and names no game; the Meu Timão page says
 * nothing about broadcasting the competition. A channel that merely holds
 * rights to a competition does not air every game of it, and putting one on a
 * match page it isn't airing sends a viewer to the wrong place. They arrive
 * the usual way — futnatv listing them per game — and need no change here.
 *
 * Corinthians' last group game (21/out) is against Santa Fé: Colombia sends
 * two clubs, the champion to Group D and the runner-up to Group A. Deportivo
 * Cali beat Santa Fe 7-4 on aggregate in the league final (26/09/2026), so
 * Santa Fe is Corinthians' opponent — which fits Pluto TV's "vice-campeão
 * colombiano x Corinthians" and UOL's "Colombia 2 x Corinthians". (UOL's own
 * group list labels the Colombian slots the other way round, "Colombia 1" in
 * Group A; its schedule and Pluto's list agree with each other instead.)
 */
const LIBERTADORES_FEMININA_FIRST_PHASE: ManualFixture[] = [
  { date: "2026-10-15", time: "17:00", home: ["corinthians_feminino", "Corinthians"], away: ["colo_colo_feminino", "Colo-Colo"], palmeiras: false },
  { date: "2026-10-15", time: "21:00", home: ["universitario_feminino", "Universitario"], away: ["palmeiras_feminino", "Palmeiras"], palmeiras: true },
  { date: "2026-10-16", time: "21:00", home: ["cruzeiro_feminino", "Cruzeiro"], away: ["ldu_feminino", "LDU de Quito"], palmeiras: false },
  { date: "2026-10-18", time: "17:00", home: ["belgrano_feminino", "Belgrano"], away: ["palmeiras_feminino", "Palmeiras"], palmeiras: true },
  { date: "2026-10-18", time: "21:00", home: ["corinthians_feminino", "Corinthians"], away: ["caracas_feminino", "Caracas"], palmeiras: false },
  { date: "2026-10-19", time: "17:00", home: ["cruzeiro_feminino", "Cruzeiro"], away: ["bolivar_feminino", "Bolívar"], palmeiras: false },
  { date: "2026-10-21", time: "21:00", home: ["palmeiras_feminino", "Palmeiras"], away: ["independiente_del_valle_feminino", "Independiente del Valle"], palmeiras: true },
  { date: "2026-10-21", time: "17:00", home: ["santa_fe_feminino", "Santa Fé"], away: ["corinthians_feminino", "Corinthians"], palmeiras: false },
  { date: "2026-10-22", time: "21:00", home: ["olimpia_feminino", "Olimpia"], away: ["cruzeiro_feminino", "Cruzeiro"], palmeiras: false },
].map(({ date, time, home, away, palmeiras }) => ({
  competitionId: "libertadores-feminina",
  homeTeamId: home[0],
  homeTeamNameRaw: home[1],
  awayTeamId: away[0],
  awayTeamNameRaw: away[1],
  date,
  time,
  channelIds: ["uol", "goat", "pluto", ...(palmeiras ? ["tvpalmeiras"] : [])],
}));

export const MANUAL_FIXTURES: ManualFixture[] = [...LIBERTADORES_FEMININA_FIRST_PHASE];

export interface ManualRows {
  matchRows: (typeof matches.$inferInsert)[];
  broadcastRows: (typeof broadcasts.$inferInsert)[];
}

/** Pure expansion of the table into rows, so the shape can be tested without a database. */
export function expandManualFixtures(fixtures: ManualFixture[], now: string): ManualRows {
  const matchRows: ManualRows["matchRows"] = [];
  const broadcastRows: ManualRows["broadcastRows"] = [];

  for (const fixture of fixtures) {
    const matchId = `${MANUAL_SOURCE_ID}:${fixture.competitionId}:${fixture.homeTeamId}__${fixture.awayTeamId}__${fixture.date}`;
    matchRows.push({
      id: matchId,
      competitionId: fixture.competitionId,
      homeTeamId: fixture.homeTeamId,
      homeTeamNameRaw: fixture.homeTeamNameRaw,
      homeTeamCrestUrl: "",
      awayTeamId: fixture.awayTeamId,
      awayTeamNameRaw: fixture.awayTeamNameRaw,
      awayTeamCrestUrl: "",
      kickoffUtc: brasiliaToUtc(fixture.date, fixture.time),
      kickoffTimeConfirmed: true,
      round: null,
      status: "scheduled",
      sourceId: MANUAL_SOURCE_ID,
      createdAt: now,
      updatedAt: now,
    });
    for (const channelId of fixture.channelIds) {
      broadcastRows.push({
        id: `${matchId}__${channelId}`,
        matchId,
        channelId,
        logoUrl: "",
        watchUrl: null,
        sourceId: MANUAL_SOURCE_ID,
        createdAt: now,
      });
    }
  }
  return { matchRows, broadcastRows };
}

/**
 * Inserts the table's games, and never touches one that already exists.
 * onConflictDoNothing rather than an update, on purpose: once futnatv
 * lists a game it refreshes this row's teams and kickoff (see
 * femininoEnrichment.ts), and an update here would put the placeholders and
 * the stale snapshot back on every single run. The price is that correcting
 * a typo in the table above needs the row deleted too — rare, and the
 * alternative fails silently on every ingest.
 */
export async function runManualFixtures(): Promise<void> {
  const startedAt = new Date().toISOString();

  await runBroadcastSource(MANUAL_SOURCE_ID, async () => {
    const now = new Date().toISOString();
    const { matchRows, broadcastRows } = expandManualFixtures(MANUAL_FIXTURES, now);

    const writes = [
      ...matchRows.map((row) => db.insert(matches).values(row).onConflictDoNothing({ target: matches.id })),
      ...broadcastRows.map((row) => db.insert(broadcasts).values(row).onConflictDoNothing({ target: broadcasts.id })),
    ];
    if (writes.length > 0) {
      const [first, ...rest] = writes;
      await db.batch([first, ...rest]);
    }

    await db.insert(scrapeRuns).values({
      sourceId: MANUAL_SOURCE_ID,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "ok",
      matchesFound: matchRows.length,
      matchesUnresolved: 0,
    });
    console.log(`[${MANUAL_SOURCE_ID}] ensured ${matchRows.length} matches, ${broadcastRows.length} broadcasts`);
  });
}
