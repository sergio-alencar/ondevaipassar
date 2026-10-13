import { resolveChannelId } from "@ondevaipassar/shared";
import { extractConfirmedChannelNames } from "./ondeAssistirArticle.js";

/** A women's game as ge.globo's own "onde assistir" article describes it. */
export interface WomensArticleGame {
  homeTeamNameRaw: string;
  awayTeamNameRaw: string;
  /** The tournament as the article names it ("Copa do Brasil Feminina"), for the competition resolver; may be empty. */
  competitionName: string;
  kickoffUtc: string;
  channelIds: string[];
}

const URL_DATE_PATTERN = /\/noticia\/(\d{4})\/(\d{2})\/(\d{2})\//;
const WEEKDAYS: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const stripTags = (html: string): string =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const strip = (value: string): string => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** A feed item is worth fetching when it is a women's "onde assistir" preview: the url sits in ge's women's section and the title pairs two teams. */
export function isWomensPreviewCandidate(item: { title: string; url: string }): boolean {
  return /\/futebol-feminino\//.test(item.url) && /\/noticia\//.test(item.url) && / x /.test(item.title) && /onde assistir/i.test(item.title);
}

/** "Ferroviária x Bragantino na Copa do Brasil Feminina: onde assistir…" -> the two names; null when the title doesn't pair two sides. */
export function parseTitleTeams(title: string): { home: string; away: string } | null {
  const pair = title.split(":")[0];
  const index = pair.indexOf(" x ");
  if (index === -1) return null;
  const home = pair.slice(0, index).trim();
  // The away side ends where the competition starts: "Bragantino na Copa do Brasil Feminina".
  const away = pair.slice(index + 3).replace(/\s+(?:na|no|pela|pelo|pelas|pelos|em|nas|nos)\s+.*$/i, "").trim();
  return home && away ? { home, away } : null;
}

/**
 * The date a game is on, from the article's own wording ("nesta segunda", "hoje",
 * "amanhã") relative to the date it was published. Null when the sentence has
 * none of those: a guess here would put a game on the wrong day.
 */
export function resolveGameDate(sentence: string, publishedKey: string): string | null {
  const [year, month, day] = publishedKey.split("-").map(Number);
  const published = Date.UTC(year, month - 1, day);
  const text = strip(sentence);
  const toKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

  if (/\bhoje\b/.test(text)) return toKey(published);
  if (/\bamanha\b/.test(text)) return toKey(published + MS_PER_DAY);
  const weekday = text.match(/\b(segunda|terca|quarta|quinta|sexta|sabado|domingo)\b/);
  if (!weekday) return null;
  const target = WEEKDAYS[weekday[1]];
  for (let offset = 0; offset < 7; offset++) {
    const candidate = published + offset * MS_PER_DAY;
    if (new Date(candidate).getUTCDay() === target) return toKey(candidate);
  }
  return null;
}

/** "às 18h" / "às 20h30" -> UTC kickoff on `dateKey` (BRT, fixed UTC-3 since 2019, same assumption as the rest of the codebase). */
export function kickoffFrom(dateKey: string, hour: string, minute: string | undefined): string | null {
  const [year, month, day] = dateKey.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, Number(hour) + 3, Number(minute ?? "0")));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Reads one women's preview article. The page carries other articles'
 * snippets (a sidebar with its own games and times), so only the article's own
 * pieces are read: the h1, the subtitle, and the lead paragraph. Null when
 * anything needed — two teams, a day, a time — can't be read with certainty.
 */
export function parseWomensArticle(html: string, url: string): WomensArticleGame | null {
  const dateMatch = url.match(URL_DATE_PATTERN);
  if (!dateMatch) return null;
  const publishedKey = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;

  const title = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
  const teams = parseTitleTeams(title);
  if (!teams) return null;

  const subtitle = stripTags(html.match(/<h2 class="content-head__subtitle[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? "");
  const lead = stripTags(html.match(/<div[^>]*data-block-type="unstyled"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "");

  // The first sentence, in the lead or the subtitle, that gives a time of day.
  let kickoffUtc: string | null = null;
  for (const text of [lead, subtitle]) {
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const time = sentence.match(/(?:^|\s)às\s+(\d{1,2})h(\d{2})?/i);
      if (!time) continue;
      // The day can sit in the sentence next to it when the time sentence has none ("Hoje." / "Nesta segunda,").
      const dateKey = resolveGameDate(sentence, publishedKey) ?? resolveGameDate(text, publishedKey);
      if (dateKey) kickoffUtc = kickoffFrom(dateKey, time[1], time[2]);
      break;
    }
    if (kickoffUtc) break;
  }
  if (!kickoffUtc) return null;

  // The tournament: "...na Copa do Brasil Feminina: onde assistir" in the title, else the url's section ("copa-do-brasil-feminina").
  const fromTitle = title.split(":")[0].match(/\s(?:na|no|pela|pelo|pelas|pelos|nas|nos)\s+(.+)$/i)?.[1];
  const section = new URL(url).pathname.split("/noticia/")[0].split("/").pop() ?? "";
  const competitionName = fromTitle ?? (section === "futebol-feminino" ? "" : section.replace(/-/g, " "));
  const channelIds = [...new Set(extractConfirmedChannelNames(html).map(resolveChannelId).filter((id): id is string => id !== null))];

  return { homeTeamNameRaw: teams.home, awayTeamNameRaw: teams.away, competitionName, kickoffUtc, channelIds };
}
