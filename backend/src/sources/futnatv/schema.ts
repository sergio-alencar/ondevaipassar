import { z } from "zod";

// Shape verified against a live fetch of
// https://futnatv.net/api/futebol?data=2026-08-28 on 2026-08-28 — futnatv's
// own internal per-day schedule endpoint (found live: its client bundle
// calls this from getScheduleUrlForDate(dateKey), not a public/documented
// API). `broadcast` is deliberately kept as raw prose here — its own real
// shape (bare channel names, a "Globo (state list)" qualifier, a "YouTube
// (channel name(s))" wrapper) is parsed downstream in broadcastText.ts,
// not by this schema.
const gameSchema = z.object({
  sport: z.string(),
  /** "HH'h'MM", always BRT — e.g. "14h00". */
  time: z.string(),
  /** e.g. "Campeonato Brasileiro Série A", "Brasileirão Feminino", "Copa Paraná" — the ONLY reliable signal that a game is women's football, since the team names themselves are often identical text to a men's club (see ingest/femininoTeamResolver.ts's own doc comment for why that matters). */
  competition: z.string(),
  home: z.string(),
  away: z.string(),
  broadcast: z.string(),
  /** A direct link to this specific match's own YouTube stream, when the broadcast includes one — not every game has this. */
  youtubeUrl: z.string().nullable().optional(),
});

const dayScheduleSchema = z.object({
  /** "YYYY-MM-DD". */
  key: z.string(),
  games: z.array(gameSchema),
});

const apiResponseSchema = z.object({
  schedule: z.array(dayScheduleSchema),
  /** Every date this endpoint currently has data for (confirmed live: roughly a week back + a week ahead of "today") — lets one fetch discover the whole window instead of guessing how far ahead to look. */
  availableDates: z.array(z.string()),
});

export type Game = z.infer<typeof gameSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;

/** Validates the whole day's-schedule response, returning null (never throwing) if the shape doesn't match. */
export function parseApiResponse(value: unknown): ApiResponse | null {
  const result = apiResponseSchema.safeParse(value);
  return result.success ? result.data : null;
}
