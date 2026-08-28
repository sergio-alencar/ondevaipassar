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

/** Pure parse of one competition page's already-fetched html. */
export function parseCompetitionPage(html: string): RoundMatchCard[] {
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
      const roundMatch = list.sectionHeader?.subtitle?.match(ROUND_NUMBER_PATTERN);
      const round = roundMatch ? Number(roundMatch[0]) : null;

      for (const rawCard of list.matchCards ?? []) {
        const card = parseMatchCard(rawCard);
        if (card) results.push({ card, round });
      }
    }
  }

  return results;
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
