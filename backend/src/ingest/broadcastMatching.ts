// Shared by every "no fixtures API, just a team pair + a rough date/time
// straight from a broadcaster's own channel" enrichment source (YouTube
// channels, Premiere) — matches a stream against matches ge.globo already
// ingested, by team pair (order-insensitive) and BRT calendar date.

// A stream's date can legitimately be a different calendar day than the
// match's real BRT kickoff date (kickoffUtc is what's stored) — e.g. a
// late-evening BRT kickoff rolls to the next day in UTC. Broadcasters also
// commonly start their coverage hours before actual kickoff for a pre-game
// show (confirmed live: ge tv's stream for a 21:30 BRT kickoff was
// scheduled for 18:30 BRT, a 3h lead-in) — too variable across sources to
// use as a tight time filter, so this stays a same-day check. Any wider
// risks a same-pair rematch (e.g. a two-legged Copa do Brasil tie) matching
// the wrong leg.
const DATE_TOLERANCE_DAYS = 1;

interface CalendarDate {
  day: number;
  month: number;
  year: number;
}

// Brazil has used a fixed UTC-3 offset (no DST) since 2019 — same
// assumption ge-globo/adapter.ts already relies on for the reverse
// conversion, safe to reuse here.
function toBrtCalendarDate(utcIso: string): CalendarDate {
  const brt = new Date(new Date(utcIso).getTime() - 3 * 60 * 60 * 1000);
  return { day: brt.getUTCDate(), month: brt.getUTCMonth() + 1, year: brt.getUTCFullYear() };
}

function daysBetween(a: CalendarDate, b: CalendarDate): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / msPerDay;
}

export interface TeamPairStream {
  homeTeamId: string;
  awayTeamId: string;
  /** Whatever rough date/time the broadcaster's own source gives for this stream — never trusted as *the* kickoff time, only used to pick which candidate match this is. */
  streamDateUtc: string;
}

export interface MatchCandidate {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  kickoffUtc: string;
}

export interface MatchedBroadcasts {
  /** ids of already-ingested matches that should get a broadcast attached. */
  matchIds: string[];
  /** streams that didn't resolve to exactly one candidate match — zero (no fixture found yet) or 2+ (genuine ambiguity, e.g. a same-pair rematch within the date tolerance). */
  unresolvedCount: number;
}

export function matchStreamsToBroadcasts<T extends TeamPairStream>(
  streams: T[],
  candidateMatches: MatchCandidate[],
): MatchedBroadcasts {
  let unresolvedCount = 0;
  const matchIds: string[] = [];

  for (const stream of streams) {
    const streamDate = toBrtCalendarDate(stream.streamDateUtc);
    const candidates = candidateMatches.filter((match) => {
      const sameOrder = match.homeTeamId === stream.homeTeamId && match.awayTeamId === stream.awayTeamId;
      const swappedOrder = match.homeTeamId === stream.awayTeamId && match.awayTeamId === stream.homeTeamId;
      if (!sameOrder && !swappedOrder) return false;
      return daysBetween(toBrtCalendarDate(match.kickoffUtc), streamDate) <= DATE_TOLERANCE_DAYS;
    });

    if (candidates.length !== 1) {
      unresolvedCount++;
      continue;
    }
    matchIds.push(candidates[0].id);
  }

  return { matchIds, unresolvedCount };
}
