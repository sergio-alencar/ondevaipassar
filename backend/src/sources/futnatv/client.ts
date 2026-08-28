import { fetchText } from "../../http/client.js";
import { parseApiResponse, type Game } from "./schema.js";

const API_URL = "https://futnatv.net/api/futebol";

export interface DatedGame {
  game: Game;
  /** "YYYY-MM-DD", BRT — the day this game's own schedule entry was listed under. */
  dateKey: string;
}

async function fetchDay(dateKey: string): Promise<{ games: Game[]; availableDates: string[] } | null> {
  const text = await fetchText(`${API_URL}?data=${dateKey}`);

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }

  const parsed = parseApiResponse(raw);
  if (!parsed) return null;

  const day = parsed.schedule.find((entry) => entry.key === dateKey);
  return { games: day?.games ?? [], availableDates: parsed.availableDates };
}

function todayBrtDateKey(): string {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return `${brt.getUTCFullYear()}-${String(brt.getUTCMonth() + 1).padStart(2, "0")}-${String(brt.getUTCDate()).padStart(2, "0")}`;
}

/**
 * futnatv.net has no fixtures API of its own either — this is its own
 * internal per-day schedule endpoint, discovered live (its client bundle
 * calls `/api/futebol?data=YYYY-MM-DD` from getScheduleUrlForDate, not a
 * documented public API — requires `?data=`, confirmed live it 400s
 * without one). Conveniently, every response already names every date the
 * endpoint currently has data for (`availableDates`, confirmed live to
 * span roughly a week back through a week ahead of "today"), so today's
 * own fetch is enough to discover the whole window without guessing how
 * far ahead to look.
 */
export async function fetchAllUpcomingGames(): Promise<DatedGame[]> {
  const today = todayBrtDateKey();
  const first = await fetchDay(today);
  if (!first) return [];

  const results: DatedGame[] = first.games.map((game) => ({ game, dateKey: today }));

  for (const dateKey of first.availableDates.filter((date) => date > today)) {
    const day = await fetchDay(dateKey);
    if (day) results.push(...day.games.map((game) => ({ game, dateKey })));
  }

  return results;
}
