import { z } from "zod";

// Shape verified against a live fetch of
// https://www.youtube.com/@CazeTV/streams on 2026-08-22. Each grid item is
// validated on its own (never the whole page as one schema) so YouTube
// changing one field doesn't drop every stream — same philosophy as
// ge-globo/schema.ts's parseSoccerEvent.
const metadataPartSchema = z.object({
  text: z.object({ content: z.string() }).nullable().optional(),
});

const lockupMetadataViewModelSchema = z.object({
  title: z.object({ content: z.string() }),
  metadata: z
    .object({
      contentMetadataViewModel: z.object({
        metadataRows: z.array(z.object({ metadataParts: z.array(metadataPartSchema).optional() })),
      }),
    })
    .optional(),
});

const lockupViewModelSchema = z.object({
  contentId: z.string(),
  metadata: z.object({ lockupMetadataViewModel: lockupMetadataViewModelSchema }),
});

export type LockupViewModel = z.infer<typeof lockupViewModelSchema>;

/** Validates a single raw grid item, returning null (never throwing) if it doesn't match — the caller counts nulls as a real "page structure changed" signal, unlike a title that simply isn't a match stream. */
export function parseLockupViewModel(value: unknown): LockupViewModel | null {
  const result = lockupViewModelSchema.safeParse(value);
  return result.success ? result.data : null;
}

const avatarViewModelSchema = z.object({
  image: z.object({ sources: z.array(z.object({ url: z.string(), width: z.number() })) }),
});

/** Picks the largest available size of the channel avatar, used as the broadcast's logoUrl fallback (the frontend always tries a local cazetv.svg first — this only matters if that 404s). */
export function parseAvatarUrl(value: unknown): string | null {
  const result = avatarViewModelSchema.safeParse(value);
  if (!result.success || result.data.image.sources.length === 0) return null;
  return result.data.image.sources.reduce((biggest, s) => (s.width > biggest.width ? s : biggest)).url;
}

// "AO VIVO: BOTAFOGO X PALMEIRAS | BRASILEIRÃO 2026 | 26ª RODADA" -> team
// names. Deliberately strict (needs " X " and a trailing "|") so unrelated
// videos on the same tab (interviews, reactions, non-match streams) just
// don't match instead of being guessed at — that's a normal skip, not an
// error, so it's the caller's job to not count it as unresolved.
const MATCH_TITLE_PATTERN = /^AO VIVO:\s*(.+?)\s+X\s+(.+?)\s*\|/i;

export interface ParsedStreamTitle {
  homeTeamNameRaw: string;
  awayTeamNameRaw: string;
}

export function parseMatchTitle(title: string): ParsedStreamTitle | null {
  const match = MATCH_TITLE_PATTERN.exec(title);
  if (!match) return null;
  return { homeTeamNameRaw: match[1].trim(), awayTeamNameRaw: match[2].trim() };
}

// "Programado para 06/09/2026, 13:30" -> date only. The time is deliberately
// discarded: checked against ge.globo's kickoff time for the same two real
// matches Sérgio pointed at, and it was off by a consistent ~5h both times —
// looks like YouTube renders it in some default-timezone guess for an
// unauthenticated fetch, not reliably Brazil time. This is only ever used to
// figure out *which* existing match a stream is for; the kickoff time shown
// to users always comes from ge.globo (see ingest/cazeTvEnrichment.ts).
const SCHEDULED_DATE_PATTERN = /Programado para (\d{2})\/(\d{2})\/(\d{4})/;

export interface ParsedStreamDate {
  day: number;
  month: number;
  year: number;
}

export function parseScheduledDate(metadataRowTexts: string[]): ParsedStreamDate | null {
  for (const text of metadataRowTexts) {
    const match = SCHEDULED_DATE_PATTERN.exec(text);
    if (match) return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
  }
  return null;
}
