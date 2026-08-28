import { fetchText } from "../../http/client.js";

// One sub-hub per European league we track — same 5 leagues as
// ge-globo-round's HUB_SOURCES. Each lists that league's own preview
// articles (mixed in with regular news, same as futebol-interior's hub),
// confirmed live: e.g. futebol-alemao/ linked 4 real
// "horario-e-onde-assistir-ao-vivo-{teams}-pela-bundesliga" articles.
const HUB_URLS = [
  "https://www.itatiaia.com.br/esportes/futebol/futebol-internacional/futebol-ingles/",
  "https://www.itatiaia.com.br/esportes/futebol/futebol-internacional/futebol-espanhol/",
  "https://www.itatiaia.com.br/esportes/futebol/futebol-internacional/futebol-alemao/",
  "https://www.itatiaia.com.br/esportes/futebol/futebol-internacional/futebol-frances/",
  "https://www.itatiaia.com.br/esportes/futebol/futebol-internacional/futebol-italiano/",
];

const ARTICLE_LINK_PATTERN = /href="(https:\/\/www\.itatiaia\.com\.br\/esportes\/futebol\/[a-z0-9/-]*onde-assistir[a-z0-9/-]*\/)"/g;

/** Discovers this run's candidate "onde assistir" preview article URLs across every tracked league hub. */
export async function fetchCandidateArticleUrls(): Promise<string[]> {
  const urls = new Set<string>();
  for (const hubUrl of HUB_URLS) {
    const html = await fetchText(hubUrl);
    for (const match of html.matchAll(ARTICLE_LINK_PATTERN)) urls.add(match[1]);
  }
  return [...urls];
}
