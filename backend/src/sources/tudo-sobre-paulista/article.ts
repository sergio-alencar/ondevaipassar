import { fetchText } from "../../http/client.js";

export interface ArticleCandidate {
  homeTeamNameRaw: string;
  awayTeamNameRaw: string;
  /** From the article's own "Data:" field (DD/MM/YYYY, always BRT) — far more precise than a publish-time proxy, unlike futebol-interior's equivalent. */
  dateUtc: string;
  url: string;
}

const TITLE_PATTERN = /<title>([^<]+)<\/title>/;
const SITE_SUFFIX_PATTERN = /\s*-\s*Tudo Sobre Paulista\s*$/i;
const PREVIEW_PREFIX_PATTERN = /^onde assistir\s+/i;
const PREVIEW_SUFFIX_PATTERN = /:\s*onde assistir.*$/i;
const DATA_PATTERN = /<strong>\s*Data:?\s*<\/strong>\s*(\d{2})\/(\d{2})\/(\d{4})/i;
const ONDE_ASSISTIR_PATTERN = /<strong>\s*Onde assistir:?\s*<\/strong>\s*(?:<a[^>]*>)?([^<]+)/i;

// Confirmed live: the site uses two different title shapes for the same
// kind of preview article — "Onde assistir Floresta x Ituano - ..." and
// "Goiás x São Bernardo: onde assistir e escalações - ..." — so team names
// get pulled out by stripping the known prefix/suffix/site-name pieces
// around " x ", rather than one regex matching both shapes at once.
function parseTeamNames(rawTitle: string): [string, string] | null {
  if (!/onde assistir/i.test(rawTitle)) return null;

  const withoutSite = rawTitle.replace(SITE_SUFFIX_PATTERN, "");
  const withoutPrefix = withoutSite.replace(PREVIEW_PREFIX_PATTERN, "");
  const withoutSuffix = withoutPrefix.replace(PREVIEW_SUFFIX_PATTERN, "");

  const parts = withoutSuffix.split(/ x /i);
  if (parts.length !== 2) return null;
  return [parts[0].trim(), parts[1].trim()];
}

/** Pure parse of one article's already-fetched html — null for anything that isn't a match-preview article. */
export function parseArticleCandidate(html: string, url: string): ArticleCandidate | null {
  const titleMatch = html.match(TITLE_PATTERN);
  if (!titleMatch) return null;

  const teamNames = parseTeamNames(titleMatch[1]);
  if (!teamNames) return null;

  const dataMatch = html.match(DATA_PATTERN);
  if (!dataMatch) return null;
  const [, day, month, year] = dataMatch;

  return {
    homeTeamNameRaw: teamNames[0],
    awayTeamNameRaw: teamNames[1],
    dateUtc: `${year}-${month}-${day}T12:00:00-03:00`,
    url,
  };
}

/** Extracts channel names from the article's "Onde assistir:" field — either plain text ("ESPN e Disney+") or a link's own text (e.g. an "<a>SportyNet</a>" wrapping its YouTube channel) — same split-on-comma/e convention as every other prose broadcast field in this codebase. */
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
