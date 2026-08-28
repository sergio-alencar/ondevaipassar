import { fetchText } from "../../http/client.js";
import type { NewsFeedItem } from "./newsFeedSchema.js";

// Every sample seen (Náutico x Athletic-MG, Cuiabá x Goiás, Goiás x
// Juventude, Atlético-GO x Botafogo-SP) uses this exact suffix — filtering
// on it (rather than e.g. "onde-assistir" anywhere in the url) avoids
// mistaking an unrelated article for one of these previews.
const TITLE_SUFFIX = ": onde assistir ao vivo, horário e escalações";

export interface ArticleCandidate {
  homeTeamNameRaw: string;
  awayTeamNameRaw: string;
  /** Midday UTC on the article's own dateline — only used to pick which already-ingested match this article is about (see broadcastMatching.ts), never trusted as a real kickoff time. */
  dateUtc: string;
  url: string;
}

const URL_DATE_PATTERN = /\/noticia\/(\d{4})\/(\d{2})\/(\d{2})\//;

/**
 * A feed item is a candidate iff its title ends with the fixed "onde
 * assistir" suffix — the part before it is always "{home} x {away}", and
 * the url's own /noticia/YYYY/MM/DD/ path segment is this preview's
 * dateline. Returns null (never throws) for any other kind of feed item
 * (most of them — a team's feed is mostly unrelated news).
 */
export function parseArticleCandidate(item: NewsFeedItem): ArticleCandidate | null {
  const { title, url } = item.content;
  if (!title.endsWith(TITLE_SUFFIX)) return null;

  const teamsPart = title.slice(0, -TITLE_SUFFIX.length);
  const separatorIndex = teamsPart.indexOf(" x ");
  if (separatorIndex === -1) return null;

  const dateMatch = url.match(URL_DATE_PATTERN);
  if (!dateMatch) return null;
  const [, year, month, day] = dateMatch;

  return {
    homeTeamNameRaw: teamsPart.slice(0, separatorIndex).trim(),
    awayTeamNameRaw: teamsPart.slice(separatorIndex + 3).trim(),
    dateUtc: `${year}-${month}-${day}T12:00:00Z`,
    url,
  };
}

const TRANSMISSAO_PATTERN = /<strong>\s*Transmiss[ãa]o:?\s*<\/strong>\s*([^<]+)/i;

/**
 * Extracts the channel names from an "onde assistir" article's
 * "Transmissão: X e Y." bullet — confirmed live, this exact
 * `<li><strong>Transmissão:</strong> ...</li>` markup across every sample
 * article fetched. Splits on "e"/"," since ge.globo always writes this as
 * plain prose ("ESPN e Disney+", "Premiere e Sportv."), not a structured
 * list of channel names. Unrecognized names are left in (resolved to null
 * downstream, not silently dropped here) so an unexpected channel name
 * shows up as an unresolved count instead of vanishing invisibly.
 */
export function extractConfirmedChannelNames(html: string): string[] {
  const match = html.match(TRANSMISSAO_PATTERN);
  if (!match) return [];

  const raw = match[1].replace(/\.\s*$/, "").trim();
  return raw
    .split(/,| e /i)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

export async function fetchConfirmedChannelNames(articleUrl: string): Promise<string[]> {
  const html = await fetchText(articleUrl);
  return extractConfirmedChannelNames(html);
}
