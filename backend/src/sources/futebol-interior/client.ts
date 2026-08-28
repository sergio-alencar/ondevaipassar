import { fetchText } from "../../http/client.js";

// The hub lists every kind of Série C content mixed together (previews,
// recaps, transfer news) — filtering the link href on "serie-c" as its own
// segment narrows to Série C content, but doesn't distinguish a preview
// from a recap (both use the same "-serie-c" slug shape, confirmed live).
// That distinction is made downstream by content (article.ts), not here.
const HUB_URL = "https://www.futebolinterior.com.br/serie-c/";
const ARTICLE_LINK_PATTERN = /href="(https:\/\/www\.futebolinterior\.com\.br\/[a-z0-9-]*serie-c[a-z0-9-]*\/)"/g;

/** Discovers this run's candidate Série C article URLs from the hub page — some will be previews, most won't be (see article.ts for how those get filtered out). */
export async function fetchCandidateArticleUrls(): Promise<string[]> {
  const html = await fetchText(HUB_URL);
  const urls = new Set<string>();
  for (const match of html.matchAll(ARTICLE_LINK_PATTERN)) {
    if (match[1] !== HUB_URL) urls.add(match[1]);
  }
  return [...urls];
}
