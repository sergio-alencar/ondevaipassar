import { z } from "zod";

// YouTube Data API v3's actual documented response shapes — much smaller
// and more stable a surface than the old HTML-embedded ytInitialData blob
// this replaced (see git history for sources/caze-tv/), since this is a
// real versioned API contract, not an internal rendering implementation
// detail Google can reshape without notice.
const searchItemSchema = z.object({
  id: z.object({ videoId: z.string() }),
  snippet: z.object({ title: z.string(), channelId: z.string() }),
});
export const searchResponseSchema = z.object({ items: z.array(searchItemSchema) });

const videoItemSchema = z.object({
  id: z.string(),
  liveStreamingDetails: z.object({ scheduledStartTime: z.string() }).optional(),
});
export const videosResponseSchema = z.object({ items: z.array(videoItemSchema) });

const channelItemSchema = z.object({
  snippet: z.object({ thumbnails: z.object({ high: z.object({ url: z.string() }) }) }),
});
export const channelResponseSchema = z.object({ items: z.array(channelItemSchema) });

// Every broadcaster phrases its "AO VIVO" title differently — verified
// against a live fetch of all 5 tracked channels' real upcoming videos on
// 2026-08-26. Tried in order, first match wins; a title matching none of
// these just isn't a match-day livestream (an interview, a highlights
// reel, a different sport) and is skipped, same as before.
const TITLE_PATTERNS = [
  // ge tv, CazéTV: "AO VIVO: BOTAFOGO X PALMEIRAS | BRASILEIRÃO..."
  /^AO VIVO:\s*(.+?)\s+X\s+(.+?)\s*\|/i,
  // SportyNet: "ITABAIANA X BOTAFOGO-PB: AO VIVO, COM IMAGENS..."
  /^(.+?)\s+X\s+(.+?)\s*:\s*AO VIVO/i,
  // Canal GOAT, ge tv (some titles): "CRB X CRICIÚMA | AO VIVO E COM IMAGENS..."
  /^(.+?)\s+X\s+(.+?)\s*\|\s*AO VIVO/i,
  // FPF TV: "COPA PARANÁ 2026 | ATHLETICO X PARANÁ CLUBE | RODADA 1, AO
  // VIVO E DE GRAÇA!" — team pair sits between the 2nd and 3rd "|"-
  // delimited segment, with "AO VIVO" only appearing later in the 4th one,
  // not immediately after the team names the way every other channel's
  // title has it. Confirmed live against 2 real titles.
  /\|\s*(.+?)\s+X\s+(.+?)\s*\|\s*[^|]*AO VIVO/i,
  // N Sports: "🔴 AO VIVO E COM IMAGENS I BAHIA X PALMEIRAS I QUARTAS DE
  // FINAL I BRASILEIRÃO FEMININO 2026" — same "AO VIVO first, team pair
  // after" shape as FPF TV's, but segments are separated by the literal
  // letter "I" (confirmed live, not a pipe or any special bar character)
  // instead of "|". Confirmed live against real titles, including a
  // Brasileirão Feminino one — see femininoTeamResolver.ts's own doc
  // comment for why resolving THIS channel's team names needs the
  // dedicated Feminino resolver, never the shared one.
  /AO VIVO E COM IMAGENS\s+I\s+(.+?)\s+X\s+(.+?)\s+I\s+/i,
];

export interface ParsedStreamTitle {
  homeTeamNameRaw: string;
  awayTeamNameRaw: string;
}

export function parseMatchTitle(title: string): ParsedStreamTitle | null {
  for (const pattern of TITLE_PATTERNS) {
    const match = pattern.exec(title);
    if (match) return { homeTeamNameRaw: match[1].trim(), awayTeamNameRaw: match[2].trim() };
  }
  return null;
}
