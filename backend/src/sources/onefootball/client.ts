import { fetchText } from "../../http/client.js";
import { parseMatchCard, type MatchCard } from "./schema.js";

export interface RoundMatchCard {
  card: MatchCard;
  /** From the enclosing list's own "Rodada N" section header — null if that text wasn't in the expected shape, never guessed. */
  round: number | null;
}

const NEXT_DATA_PATTERN = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s;
const ROUND_NUMBER_PATTERN = /\d+/;

// The page's own component tree tags every node with a `$case` key naming
// its content type — this walks the whole tree looking for nodes of one
// specific case, rather than this client describing the tree's full shape
// (confirmed live: matchCardsListsAppender sits at a different nesting
// depth than other content on the same page, and that depth isn't
// documented or guaranteed stable).
function findByCase(value: unknown, targetCase: string, results: unknown[] = []): unknown[] {
  if (Array.isArray(value)) {
    for (const item of value) findByCase(item, targetCase, results);
  } else if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record["$case"] === targetCase) results.push(record[targetCase]);
    for (const nested of Object.values(record)) findByCase(nested, targetCase, results);
  }
  return results;
}

/**
 * Pure parse of an already-fetched page's html. `readRound` is false for a
 * team page, whose section headers are MONTHS ("setembro 2026") rather than
 * rounds — running the round extractor over those would happily pull "2026"
 * out and record it as the round number.
 */
function parsePage(html: string, readRound: boolean): RoundMatchCard[] {
  const scriptMatch = html.match(NEXT_DATA_PATTERN);
  if (!scriptMatch) return [];

  let data: unknown;
  try {
    data = JSON.parse(scriptMatch[1]);
  } catch {
    return [];
  }

  const appenders = findByCase(data, "matchCardsListsAppender") as { lists?: unknown[] }[];
  const results: RoundMatchCard[] = [];

  for (const appender of appenders) {
    if (!Array.isArray(appender.lists)) continue;

    for (const rawList of appender.lists) {
      const list = rawList as { matchCards?: unknown[]; sectionHeader?: { subtitle?: string } };
      const roundMatch = readRound ? list.sectionHeader?.subtitle?.match(ROUND_NUMBER_PATTERN) : null;
      const round = roundMatch ? Number(roundMatch[0]) : null;

      for (const rawCard of list.matchCards ?? []) {
        const card = parseMatchCard(rawCard);
        if (card) results.push({ card, round });
      }
    }
  }

  return results;
}

/** Pure parse of one competition page's already-fetched html. */
export function parseCompetitionPage(html: string): RoundMatchCard[] {
  return parsePage(html, true);
}

/**
 * OneFootball has no fixtures API either — this reads a competition's own
 * "jogos" page, which (unlike ge.globo's own hub) server-renders several
 * rounds ahead in one fetch (confirmed live: 4 rounds / 36 matches for
 * Bundesliga, no pagination needed). See ingest/onefootballEnrichment.ts
 * for how this both fills in matches ge.globo's own sources never found
 * AND stays out of the way of ones they did.
 */
export async function fetchCompetitionMatchCards(competitionSlug: string): Promise<RoundMatchCard[]> {
  const html = await fetchText(`https://onefootball.com/pt-br/competicao/${competitionSlug}/jogos`);
  return parseCompetitionPage(html);
}

/** Pure parse of one team page's already-fetched html. */
export function parseTeamPage(html: string): RoundMatchCard[] {
  return parsePage(html, false);
}

/**
 * One club's whole upcoming schedule, across every competition it's in —
 * league, national cup and European cup together, each card naming its own
 * competition. This is what the per-competition pages above can't give:
 * they'd need one known slug per cup, and a wrong slug doesn't 404, it
 * silently serves another competition entirely.
 *
 * `teamId` is OneFootball's own numeric club id. The name part of the URL
 * slug is decorative — confirmed live, "qualquer-nome-errado-6" serves
 * Bayern de Munique just as "bayern-de-munique-6" does — which cuts both
 * ways: a WRONG id serves some other club's fixtures with no error at all,
 * so every id in TRACKED_EUROPEAN_TEAMS was verified against the page's own
 * title before being written down.
 */
export async function fetchTeamMatchCards(teamId: string): Promise<RoundMatchCard[]> {
  const html = await fetchText(`https://onefootball.com/pt-br/time/t-${teamId}/jogos`);
  return parsePage(html, false);
}
