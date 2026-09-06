import { findCompetitionById, type MatchView } from "@ondevaipassar/shared";
import { MAX_CAROUSEL_ITEMS } from "./graphApiClient.js";

/** Synthetic competition id for the combined European post — also the filename of its logo (see assets.ts's competitionLogoDataUri). */
export const EUROPE_GROUP_ID = "europa";
export const EUROPE_GROUP_NAME = "Jogos da Europa";

/** One post: a competition's matches for the day, already chunked to what a single carousel can hold. */
export interface PostGroup {
  competitionId: string;
  competitionName: string;
  matches: MatchView[];
  part: number;
  totalParts: number;
}

/**
 * One carousel per competition per day, instead of one post per match.
 * Sergio asked for this on feed-quality grounds, but it also cuts directly
 * at the failure hit on 2026-09-05: publishing is the rate-limited action,
 * and this turns ~20 publishes a day into ~5.
 *
 * A competition with more matches than a carousel holds is split across
 * numbered posts rather than dropping any. Competition ORDER follows the
 * same rule as the digest (Brazilian before foreign, Serie A/B/C pinned),
 * so the account posts the biggest draw first on a busy morning - which is
 * also what survives if the run is cut short.
 */
export function groupIntoPosts(matches: MatchView[]): PostGroup[] {
  const byCompetition = new Map<string, MatchView[]>();
  for (const match of matches) {
    // Every foreign competition lands in one post. Split by competition,
    // the European side produced a stream of one- and two-match carousels
    // (Premier League, LaLiga, Serie A, Champions, Liga Europa, EFL Cup...)
    // on a normal midweek — Sérgio asked for a single "jogos da Europa"
    // instead. Each slide still names the competition of the match on it,
    // so nothing is lost by merging.
    const key = findCompetitionById(match.competitionId)?.foreign === true ? EUROPE_GROUP_ID : match.competitionId;
    byCompetition.set(key, [...(byCompetition.get(key) ?? []), match]);
  }

  const ordered = [...byCompetition.entries()].sort(([a], [b]) => {
    const foreign = Number(a === EUROPE_GROUP_ID) - Number(b === EUROPE_GROUP_ID);
    if (foreign !== 0) return foreign;
    return (
      (findCompetitionById(a)?.priority ?? Number.MAX_SAFE_INTEGER) -
      (findCompetitionById(b)?.priority ?? Number.MAX_SAFE_INTEGER)
    );
  });

  const groups: PostGroup[] = [];
  for (const [competitionId, competitionMatches] of ordered) {
    const chunks: MatchView[][] = [];
    for (let i = 0; i < competitionMatches.length; i += MAX_CAROUSEL_ITEMS) {
      chunks.push(competitionMatches.slice(i, i + MAX_CAROUSEL_ITEMS));
    }
    chunks.forEach((chunk, index) =>
      groups.push({
        competitionId,
        competitionName:
          competitionId === EUROPE_GROUP_ID
            ? EUROPE_GROUP_NAME
            : (findCompetitionById(competitionId)?.displayName ?? competitionMatches[0].competitionName),
        matches: chunk,
        part: index + 1,
        totalParts: chunks.length,
      }),
    );
  }
  return groups;
}
