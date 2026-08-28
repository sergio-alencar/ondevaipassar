import { fetchText } from "../../http/client.js";
import { extractBalancedJsonObject } from "../../http/json.js";
import { parseNewsFeedItem, type NewsFeedItem } from "./newsFeedSchema.js";

const ITEMS_MARKER = '"items":[{"age":';

// A team's own ge.globo page (not the agenda page — the team's news-feed
// homepage) embeds its recent-articles widget as a JSON array inside a
// minified <script id="bstn-launcher-bundle"> blob, e.g.:
//   ...,"items":[{"age":123,...,"content":{"url":"...","title":"..."},...},...],...
// Confirmed live on both Náutico's and Goiás's team pages: this is where
// each team's own "Time A x Time B: onde assistir ao vivo, horário e
// escalações" preview article shows up, same day it's published — the
// per-team agenda JSON we scrape for fixtures/kickoff never carries this
// (see ondeAssistirArticle.ts for why that matters). Only one "items"-array
// widget observed per page in both samples.
export function extractNewsFeedItems(html: string): NewsFeedItem[] {
  const markerIndex = html.indexOf(ITEMS_MARKER);
  if (markerIndex === -1) {
    throw new Error(`"${ITEMS_MARKER}" not found — ge.globo's news-feed page structure may have changed`);
  }
  const openBracketIndex = markerIndex + ITEMS_MARKER.indexOf("[");
  const rawJson = extractBalancedJsonObject(html, openBracketIndex);
  const parsed: unknown = JSON.parse(rawJson);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(parseNewsFeedItem).filter((item): item is NewsFeedItem => item !== null);
}

export function buildTeamNewsFeedUrl(geGloboSlug: string): string {
  return `https://ge.globo.com/futebol/times/${geGloboSlug}/`;
}

export async function fetchTeamNewsFeed(geGloboSlug: string): Promise<NewsFeedItem[]> {
  const html = await fetchText(buildTeamNewsFeedUrl(geGloboSlug));
  return extractNewsFeedItems(html);
}
