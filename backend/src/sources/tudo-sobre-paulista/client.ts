import { fetchText } from "../../http/client.js";

// The homepage mixes every kind of news (transfers, opinion, match previews)
// — requiring "onde-assistir" as its own text inside the slug (confirmed
// live in both real examples: "onde-assistir-floresta-x-ituano" and
// "goias-x-sao-bernardo-onde-assistir-e-escalacoes", position varies but the
// substring is always present) is what narrows discovery to preview articles
// specifically, unlike Futebol Interior's hub where that has to happen
// downstream by content instead.
const HUB_URL = "https://tudosobrepaulista.com.br/";
const ARTICLE_LINK_PATTERN = /href="(https:\/\/tudosobrepaulista\.com\.br\/materia\/[a-z0-9-]*onde-assistir[a-z0-9-]*\/)"/g;

export async function fetchCandidateArticleUrls(): Promise<string[]> {
  const html = await fetchText(HUB_URL);
  const urls = new Set<string>();
  for (const match of html.matchAll(ARTICLE_LINK_PATTERN)) urls.add(match[1]);
  return [...urls];
}
