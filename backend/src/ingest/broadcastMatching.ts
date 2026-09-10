import { normalizeText } from "@ondevaipassar/shared";

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
  // Nullable, not always string: a source only ever resolves an id for a
  // team WE track (see e.g. youtube/adapter.ts's resolveTeamId calls) — for
  // the "Europa" division we track 20 individual clubs out of entire
  // leagues, so "our tracked club vs. some other club we don't track at
  // all" is the NORMAL case there, not a rare edge case the way it was
  // when every source only ever covered fully-tracked Brasileirão
  // divisions. null means "unresolved/untracked side," matched as a
  // wildcard below — see teamMatches.
  homeTeamId: string | null;
  awayTeamId: string | null;
  /** The source's own spelling of each side. Only used when BOTH ids are null — see nameMatches. */
  homeTeamNameRaw?: string;
  awayTeamNameRaw?: string;
  /** Whatever rough date/time the broadcaster's own source gives for this stream — never trusted as *the* kickoff time, only used to pick which candidate match this is. */
  streamDateUtc: string;
}

// null on the stream side means "untracked opponent, could be anyone" — a
// wildcard, not a mismatch. Both non-null sides must still agree exactly.
function teamMatches(streamTeamId: string | null, candidateTeamId: string | null): boolean {
  return streamTeamId === null || streamTeamId === candidateTeamId;
}

export interface MatchCandidate {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamNameRaw: string;
  awayTeamNameRaw: string;
  kickoffUtc: string;
}

/**
 * Same club, as spelled by two different sources: one side's words must be
 * a subset of the other's. Real pairs this reconciles, all from one day of
 * Champions League fixtures — "Shakhtar" vs "FC Shakhtar Donetsk", "Como"
 * vs "Como 1907", "Slavia Praga" vs "SK Slavia Praga".
 *
 * Compared as whole WORDS, never substrings: "Inter" is a subset of "Inter
 * de Milão" (right) but not of "Internacional" (which substring matching
 * would have wrongly joined).
 */
function nameMatches(a: string, b: string): boolean {
  const words = (value: string): Set<string> => new Set(normalizeText(value).split(/\s+/).filter(Boolean));
  const wordsA = words(a);
  const wordsB = words(b);
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  const [smaller, larger] = wordsA.size <= wordsB.size ? [wordsA, wordsB] : [wordsB, wordsA];
  return [...smaller].every((word) => larger.has(word));
}

export interface MatchedBroadcasts<T> {
  /** ids of already-ingested matches that should get a broadcast attached. */
  matchIds: string[];
  /** Same order/index as matchIds — the original stream that produced each match, for a caller that needs a per-stream field beyond just the matchId (e.g. YouTube's videoId, for a direct link to that specific stream instead of the channel's generic URL). */
  matchedStreams: T[];
  /** streams that didn't resolve to exactly one candidate match — zero (no fixture found yet) or 2+ (genuine ambiguity, e.g. a same-pair rematch within the date tolerance). */
  unresolvedCount: number;
}

export function matchStreamsToBroadcasts<T extends TeamPairStream>(
  streams: T[],
  candidateMatches: MatchCandidate[],
): MatchedBroadcasts<T> {
  let unresolvedCount = 0;
  const matchIds: string[] = [];
  const matchedStreams: T[] = [];

  for (const stream of streams) {
    // Both sides untracked: ids can't tell two fixtures apart (they're both
    // null, which would wildcard-match every fixture on the date), so the
    // names are all there is. Only reachable for a source that supplies
    // them — without names this still bails, as it always did.
    //
    // This case only exists because the European cups are now ingested
    // whole (see onefootballEnrichment's FULL_COVERAGE_COMPETITIONS): those
    // fixtures are real and on the site, but every broadcast source used to
    // drop them here, so four Champions League matches sat on "transmissão
    // a confirmar" while futnatv had the answer all along.
    const bothUntracked = stream.homeTeamId === null && stream.awayTeamId === null;
    if (bothUntracked && !(stream.homeTeamNameRaw && stream.awayTeamNameRaw)) {
      unresolvedCount++;
      continue;
    }

    const streamDate = toBrtCalendarDate(stream.streamDateUtc);
    const candidates = candidateMatches.filter((match) => {
      const sameOrder = bothUntracked
        ? nameMatches(stream.homeTeamNameRaw as string, match.homeTeamNameRaw) &&
          nameMatches(stream.awayTeamNameRaw as string, match.awayTeamNameRaw)
        : teamMatches(stream.homeTeamId, match.homeTeamId) && teamMatches(stream.awayTeamId, match.awayTeamId);
      const swappedOrder = bothUntracked
        ? nameMatches(stream.homeTeamNameRaw as string, match.awayTeamNameRaw) &&
          nameMatches(stream.awayTeamNameRaw as string, match.homeTeamNameRaw)
        : teamMatches(stream.homeTeamId, match.awayTeamId) && teamMatches(stream.awayTeamId, match.homeTeamId);
      if (!sameOrder && !swappedOrder) return false;
      return daysBetween(toBrtCalendarDate(match.kickoffUtc), streamDate) <= DATE_TOLERANCE_DAYS;
    });

    // A wildcard (untracked opponent) side widens `candidates` to catch
    // any real 1-day rollover — but real bug found live: Athletico-PR's
    // own FPF TV stream ("Athletico x Paraná Clube", Paraná untracked so
    // the away side wildcards) landed on the SAME BRT day as the real Copa
    // Paraná fixture, yet also fell within the 1-day tolerance of an
    // unrelated Série A match the following day (Athletico-PR x
    // Fluminense) — 2 candidates, silently unresolved, no broadcast ever
    // attached. When the tolerant set has more than one candidate, narrow
    // to same-BRT-day matches first; only fall back to "ambiguous" if that
    // narrower set still isn't exactly one (e.g. a genuine same-day
    // doubleheader for the same team pair).
    const sameDayCandidates =
      candidates.length > 1 ? candidates.filter((match) => daysBetween(toBrtCalendarDate(match.kickoffUtc), streamDate) === 0) : candidates;
    const resolved = sameDayCandidates.length === 1 ? sameDayCandidates : candidates;

    if (resolved.length !== 1) {
      unresolvedCount++;
      continue;
    }
    matchIds.push(resolved[0].id);
    matchedStreams.push(stream);
  }

  return { matchIds, matchedStreams, unresolvedCount };
}
