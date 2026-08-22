import { db } from "../db/client.js";
import { broadcasts, matches, scrapeRuns } from "../db/schema.js";
import { fetchCazeTvStreams } from "../sources/caze-tv/adapter.js";

const CHANNEL_ID = "cazetv";
const SOURCE_ID = "caze-tv";
// A stream's date can legitimately be one calendar day off a match's real
// BRT date (a late-evening BRT kickoff rolls to the next day in UTC, and
// kickoffUtc is what's stored) — confirmed on the two real examples Sérgio
// gave. Any wider and a same-pair rematch months apart risks a false match.
const DATE_TOLERANCE_DAYS = 1;

interface CalendarDate {
  day: number;
  month: number;
  year: number;
}

// Brazil has used a fixed UTC-3 offset (no DST) since 2019 — same
// assumption ge-globo/adapter.ts already relies on for the reverse
// conversion, safe to reuse here.
function toBrtCalendarDate(kickoffUtcIso: string): CalendarDate {
  const brt = new Date(new Date(kickoffUtcIso).getTime() - 3 * 60 * 60 * 1000);
  return { day: brt.getUTCDate(), month: brt.getUTCMonth() + 1, year: brt.getUTCFullYear() };
}

function daysBetween(a: CalendarDate, b: CalendarDate): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / msPerDay;
}

/**
 * CazéTV doesn't have a fixtures API (see sources/caze-tv/adapter.ts) — it
 * only ever tells us "this team pair plays around this date". So unlike
 * runAdapter, this never creates or edits a match row: it looks for exactly
 * one already-ingested match (from ge.globo) that fits a stream's team pair
 * and date, and only then attaches a "cazetv" broadcast to it. Zero or
 * multiple candidates means we skip rather than guess. Kickoff time shown to
 * users always stays whatever ge.globo already gave us.
 */
export async function runCazeTvEnrichment(): Promise<void> {
  const startedAt = new Date().toISOString();

  try {
    const { streams, channelLogoUrl, unresolvedCount: unresolvedFromSource } = await fetchCazeTvStreams();
    const allMatches = await db.select().from(matches);
    const now = new Date().toISOString();

    let unresolved = unresolvedFromSource;
    const broadcastUpserts = [];

    for (const stream of streams) {
      const candidates = allMatches.filter((match) => {
        const sameOrder = match.homeTeamId === stream.homeTeamId && match.awayTeamId === stream.awayTeamId;
        const swappedOrder = match.homeTeamId === stream.awayTeamId && match.awayTeamId === stream.homeTeamId;
        if (!sameOrder && !swappedOrder) return false;
        return daysBetween(toBrtCalendarDate(match.kickoffUtc), stream.scheduledDate) <= DATE_TOLERANCE_DAYS;
      });

      if (candidates.length !== 1) {
        unresolved++;
        continue;
      }

      const match = candidates[0];
      broadcastUpserts.push(
        db
          .insert(broadcasts)
          .values({
            id: `${match.id}__${CHANNEL_ID}`,
            matchId: match.id,
            channelId: CHANNEL_ID,
            logoUrl: channelLogoUrl,
            sourceId: SOURCE_ID,
            createdAt: now,
          })
          .onConflictDoUpdate({ target: broadcasts.id, set: { logoUrl: channelLogoUrl } }),
      );
    }

    const [first, ...rest] = broadcastUpserts;
    if (first) await db.batch([first, ...rest]);

    await db.insert(scrapeRuns).values({
      sourceId: SOURCE_ID,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: unresolved === 0 ? "ok" : "partial",
      matchesFound: broadcastUpserts.length,
      matchesUnresolved: unresolved,
    });

    console.log(`[${SOURCE_ID}] attached ${broadcastUpserts.length} broadcasts (${unresolved} unresolved)`);
  } catch (error) {
    await db.insert(scrapeRuns).values({
      sourceId: SOURCE_ID,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      matchesFound: 0,
      matchesUnresolved: 0,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    console.error(`[${SOURCE_ID}] run failed:`, error);
  }
}
