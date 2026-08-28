import { fetchText } from "../../http/client.js";

export interface ArticleCandidate {
  homeTeamNameRaw: string;
  awayTeamNameRaw: string;
  /** The article's own publish time — only used to pick which already-ingested match this preview is about (see broadcastMatching.ts), never trusted as a real kickoff time. Futebol Interior has no explicit match-date field, unlike Tudo Sobre Paulista's "Data:" line, so this is the best available proxy (confirmed live: published 1 day before its match, well within the existing ±1-day tolerance). */
  dateUtc: string;
  url: string;
}

// Only a genuine preview article's title contains "onde assistir" — a
// post-match recap's title never does (confirmed live: "Guarani 1 x 0
// Brusque - Bugre embala nova vitória" has no such text), so this alone is
// enough to skip every non-preview article without inspecting its body.
const TITLE_PATTERN = /<title>(.+?) x (.+?) - [^<]*onde assistir[^<]*<\/title>/i;
const PUBLISHED_TIME_PATTERN = /property="article:published_time" content="([^"]+)"/;
const ONDE_ASSISTIR_PATTERN = /<strong>\s*Onde assistir\s*<\/strong>:?\s*([^<]+)/i;

/** Pure parse of one article's already-fetched html — null for anything that isn't a match-preview article (most of the hub's own links). */
export function parseArticleCandidate(html: string, url: string): ArticleCandidate | null {
  const titleMatch = html.match(TITLE_PATTERN);
  if (!titleMatch) return null;

  const publishedMatch = html.match(PUBLISHED_TIME_PATTERN);
  if (!publishedMatch) return null;

  return {
    homeTeamNameRaw: titleMatch[1].trim(),
    awayTeamNameRaw: titleMatch[2].trim(),
    dateUtc: publishedMatch[1],
    url,
  };
}

/** Extracts channel names from the article's "Onde assistir: X e Y." field — same split-on-comma/e convention as ge-globo/ondeAssistirArticle.ts's Transmissão bullet, since sources in this codebase always write it as prose, not a structured list. */
export function extractChannelNames(html: string): string[] {
  const match = html.match(ONDE_ASSISTIR_PATTERN);
  if (!match) return [];

  const raw = match[1].replace(/\.\s*$/, "").trim();
  return raw
    .split(/,| e /i)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

export interface FetchedArticle {
  candidate: ArticleCandidate;
  channelNames: string[];
}

export async function fetchArticleCandidate(url: string): Promise<FetchedArticle | null> {
  const html = await fetchText(url);
  const candidate = parseArticleCandidate(html, url);
  if (!candidate) return null;
  return { candidate, channelNames: extractChannelNames(html) };
}
