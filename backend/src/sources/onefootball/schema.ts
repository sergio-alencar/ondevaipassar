import { z } from "zod";

// Shape verified against a live fetch of
// https://onefootball.com/pt-br/competicao/bundesliga-1/jogos on 2026-08-28
// — a Next.js page, its own full server-rendered props (including this
// match data) embedded as JSON in <script id="__NEXT_DATA__">. Deeply
// nested inside a generic "UI component tree" shape (every node tagged
// with its own `$case`/content-type key, seemingly used across every kind
// of page OneFootball renders, not just this one) — client.ts's own
// findByCase walks that tree to locate this bit, rather than this schema
// describing the whole page.
const teamRefSchema = z.object({
  name: z.string(),
  imageObject: z.object({ path: z.string() }),
});

const matchCardSchema = z.object({
  matchId: z.string(),
  /** Already a real ISO UTC instant ("...Z" suffix) — unlike every other source in this codebase, no BRT-offset conversion needed. */
  kickoff: z.string(),
  homeTeam: teamRefSchema,
  awayTeam: teamRefSchema,
  /**
   * Per-match streamability signal — confirmed live against
   * https://onefootball.com/pt-br/competicao/bundesliga-1/jogos on
   * 2026-08-31 (36 of 45 cards `2`, the rest `0`, so genuinely mixed, not a
   * blanket "everything streams"): `2` sits directly next to the page's own
   * "Assista" (watch) button markup and a `"Assista de graça no
   * OneFootball"` section header, `0` doesn't. Optional because it's an
   * inference from one observed page, not a documented field — a future
   * card missing it (or using a value we haven't seen) should still parse
   * for fixture purposes, just without a broadcast attached.
   */
  ottStreamType: z.number().optional(),
});

export type MatchCard = z.infer<typeof matchCardSchema>;

/** Validates a single raw match card, returning null (never throwing) if it doesn't match — one malformed entry must not invalidate the rest of the page. */
export function parseMatchCard(value: unknown): MatchCard | null {
  const result = matchCardSchema.safeParse(value);
  return result.success ? result.data : null;
}
