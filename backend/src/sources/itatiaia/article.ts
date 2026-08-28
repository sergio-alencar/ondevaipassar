import { fetchText } from "../../http/client.js";

export interface ArticleCandidate {
  homeTeamNameRaw: string;
  awayTeamNameRaw: string;
  /** Derived from the article's own datePublished + a day-of-month mentioned in prose ("neste sábado (29)") — see computeDateUtc. Only used to pick which already-ingested match this preview is about (see broadcastMatching.ts), never trusted as a real kickoff time. */
  dateUtc: string;
  url: string;
}

// The whole article — dateline, team pair, and the "Streaming"/"YouTube"
// broadcast fields — lives in one clean JSON-LD `articleBody` string
// (confirmed live: <script id="schema-page-graph" type="application/ld+json">
// with an @graph array, one entry @type "NewsArticle"). This is
// deliberately parsed as real JSON rather than regexed out of the visible
// HTML: the visible markup's own broadcast list (a <ul> of <strong>Streaming:
// </strong>... <li>s) turned out inconsistent between articles (sometimes
// the value text sits outside any styled <span>, sometimes split across
// two), while the JSON-LD text is the same clean prose every time.
const LD_JSON_SCRIPT_PATTERN = /<script[^>]*ld\+json[^>]*>(.*?)<\/script>/s;

// Confirmed live across several real articles: the site is inconsistent
// about the trailing "ao jogo" ("... : onde assistir" vs "... : onde
// assistir ao jogo") — both accepted.
const TEAM_PAIR_LINE_PATTERN = /^(.+?) x (.+?): onde assistir(?:\s+ao jogo)?\s*$/m;

// Also confirmed inconsistent live: "neste sábado (29)" / "desta
// sexta-feira (28)" / "deste sábado (29)" — the weekday name itself is
// never trusted (arbitrary code across articles could get it wrong
// relative to the real calendar), only the day-of-month in parentheses,
// combined with the article's own datePublished for month/year (see
// computeDateUtc).
const WEEKDAY_DAY_PATTERN = /(?:domingo|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado)(?:-feira)?\s*\((\d{1,2})\)/i;

// Field label capitalization and order both vary live ("Streaming:" then
// "YouTube:", or the reverse; "YouTube" vs "Youtube") — each extracted
// independently by its own case-insensitive search, order-agnostic.
const STREAMING_FIELD_PATTERN = /streaming:\s*([^\n]+)/i;
const YOUTUBE_FIELD_PATTERN = /youtube:\s*([^\n]+)/i;

interface RawArticleData {
  articleBody: string;
  datePublished: string;
}

function isRawArticleData(value: unknown): value is RawArticleData {
  const record = value as Record<string, unknown> | null;
  return typeof record === "object" && record !== null && typeof record.articleBody === "string" && typeof record.datePublished === "string";
}

function extractArticleData(html: string): RawArticleData | null {
  const scriptMatch = html.match(LD_JSON_SCRIPT_PATTERN);
  if (!scriptMatch) return null;

  let data: unknown;
  try {
    data = JSON.parse(scriptMatch[1]);
  } catch {
    return null;
  }

  const graph = (data as { "@graph"?: unknown } | null)?.["@graph"];
  if (!Array.isArray(graph)) return null;
  return graph.find(isRawArticleData) ?? null;
}

// Same "shift by 3h, read UTC fields" trick as broadcastMatching.ts's own
// toBrtCalendarDate — not imported from there since (like ge-globo-round's
// own toKickoffUtc) the input shape here is different enough (a full ISO
// datetime with its own explicit offset, not a bare date/time pair) that a
// shared helper would need its own conversion step anyway.
function toBrtCalendarDate(iso: string): { day: number; month: number; year: number } | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  const brt = new Date(parsed.getTime() - 3 * 60 * 60 * 1000);
  return { day: brt.getUTCDate(), month: brt.getUTCMonth() + 1, year: brt.getUTCFullYear() };
}

function computeDateUtc(datePublished: string, articleBody: string): string | null {
  const dayMatch = articleBody.match(WEEKDAY_DAY_PATTERN);
  if (!dayMatch) return null;

  const published = toBrtCalendarDate(datePublished);
  if (!published) return null;

  const day = Number(dayMatch[1]);
  let month = published.month;
  let year = published.year;
  // A preview article is always published shortly BEFORE its match, never
  // after — a referenced day-of-month earlier than the publish day means
  // it's next month.
  if (day < published.day) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00-03:00`;
}

/** Pure parse of one article's already-fetched html — null for anything that isn't a match-preview article. */
export function parseArticleCandidate(html: string, url: string): ArticleCandidate | null {
  const data = extractArticleData(html);
  if (!data) return null;

  const teamMatch = data.articleBody.match(TEAM_PAIR_LINE_PATTERN);
  if (!teamMatch) return null;

  const dateUtc = computeDateUtc(data.datePublished, data.articleBody);
  if (!dateUtc) return null;

  return { homeTeamNameRaw: teamMatch[1].trim(), awayTeamNameRaw: teamMatch[2].trim(), dateUtc, url };
}

function splitChannelList(raw: string): string[] {
  return raw
    .replace(/\.\s*$/, "")
    .split(/,| e /i)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

/** Extracts channel names from BOTH the "Streaming:" and "YouTube:" fields — this codebase's channel registry doesn't distinguish delivery mechanism, so both feed the same resolveChannelId step downstream. */
export function extractChannelNames(html: string): string[] {
  const data = extractArticleData(html);
  if (!data) return [];

  const names: string[] = [];
  const streamingMatch = data.articleBody.match(STREAMING_FIELD_PATTERN);
  if (streamingMatch) names.push(...splitChannelList(streamingMatch[1]));
  const youtubeMatch = data.articleBody.match(YOUTUBE_FIELD_PATTERN);
  if (youtubeMatch) names.push(...splitChannelList(youtubeMatch[1]));
  return names;
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
