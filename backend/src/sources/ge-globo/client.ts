import { fetchText } from "../../http/client.js";
import { extractBalancedJsonObject } from "../../http/json.js";
import { parseScheduleTeamStructure, type ScheduleTeamStructure } from "./schema.js";

const SCHEDULE_MARKER = "scheduleTeam: {";

// The team-agenda page's match data is server-rendered directly into a
// <script> tag as a JS object-literal property (unquoted key — not a
// standalone JSON document), e.g.:
//   window.dataSportsSchedule = { sport: {}, ..., scheduleTeam: {"teamAgenda": {...}} };
// so we locate the "scheduleTeam: {" marker and balanced-brace-extract just
// its value, which (unlike the outer object) is valid JSON on its own —
// every key inside it is quoted. Confirmed against a real fetch; see
// test/fixtures/ge-globo-flamengo.html for the saved evidence.
export function extractScheduleTeam(html: string): ScheduleTeamStructure {
  const markerIndex = html.indexOf(SCHEDULE_MARKER);
  if (markerIndex === -1) {
    throw new Error(
      `"${SCHEDULE_MARKER}" not found — ge.globo's page structure may have changed`,
    );
  }
  const openBraceIndex = markerIndex + SCHEDULE_MARKER.length - 1;
  const rawJson = extractBalancedJsonObject(html, openBraceIndex);
  const parsed: unknown = JSON.parse(rawJson);
  return parseScheduleTeamStructure(parsed);
}

// Bigger/national clubs live at the plain /futebol/times/{slug}/... path, but
// smaller or regional clubs redirect to a state-prefixed sub-portal instead
// (confirmed live: ge.globo.com/futebol/times/mirassol/ 404s, but
// ge.globo.com/sp/tem-esporte/futebol/times/mirassol/ is the real page) —
// no single consistent rule found across states, so these are looked up
// individually as discovered rather than guessed.
const NON_STANDARD_AGENDA_PATHS: Record<string, string> = {
  mirassol: "sp/tem-esporte/futebol/times/mirassol/agenda-de-jogos-do-mirassol/",
  // These 8 teams previously had aliases.geGlobo: null (no source at all) —
  // found live while investigating why Novorizontino x Sport, a real match
  // today, was completely missing from the site: neither team had a working
  // agenda URL, so the match never got ingested by either side. Confirmed
  // each of the 8 below actually embeds the scheduleTeam JSON before adding.
  novorizontino: "sp/tem-esporte/futebol/times/novorizontino/agenda-de-jogos-do-novorizontino/",
  sport: "pe/futebol/times/sport/agenda/",
  cuiaba: "mt/futebol/times/cuiaba/agenda/",
  avai: "sc/futebol/times/avai/agenda/",
  remo: "pa/futebol/times/remo/agenda/",
  londrina: "pr/futebol/times/londrina/agenda/",
  "ponte-preta": "sp/campinas-e-regiao/futebol/times/ponte-preta/agenda-de-jogos-da-ponte-preta/",
  "athletico-pr": "pr/futebol/times/athletico-pr/agenda-de-jogos-do-athletico-pr/",
  // Série C teams added while studying viability of tracking that division —
  // these 7 are the ones that actually had a discoverable agenda page (out
  // of 20 checked live); the other 13 keep aliases.geGlobo: null and are
  // still covered by ge-globo-round's Série C hub entry for current-round
  // fixtures, same tradeoff already accepted for Athletic/Chapecoense/São
  // Bernardo.
  "amazonas-fc": "am/futebol/times/amazonas-fc/agenda-de-jogos-do-amazonas-fc/",
  "santa-cruz": "pe/futebol/times/santa-cruz/agenda-de-jogos-do-santa-cruz/",
  guarani: "sp/campinas-e-regiao/futebol/times/guarani/agenda-de-jogos-do-guarani/",
  ituano: "sp/tem-esporte/futebol/times/ituano/agenda-de-jogos-do-ituano/",
  "volta-redonda": "rj/sul-do-rio-costa-verde/futebol/times/volta-redonda/agenda/",
  brusque: "sc/futebol/times/brusque/agenda-de-jogos-do-brusque/",
  paysandu: "pa/futebol/times/paysandu/agenda-de-jogos-do-paysandu/",
  // European clubs (the "Europa" division) live under an extra
  // futebol-internacional/{liga}/ segment, always non-standard for that
  // reason alone — of the 20 checked live, only these 4 actually had a
  // discoverable agenda page; the other 16 keep aliases.geGlobo: null and
  // rely entirely on ge-globo-round's league-hub entries (see that
  // adapter's own comment) for both fixtures and crest.
  arsenal: "futebol/futebol-internacional/futebol-ingles/times/arsenal/agenda-de-jogos-do-arsenal/",
  "manchester-city": "futebol/futebol-internacional/futebol-ingles/times/manchester-city/agenda-de-jogos-do-manchester-city/",
  barcelona: "futebol/futebol-internacional/futebol-espanhol/times/barcelona/agenda-de-jogos-do-barcelona/",
  "real-madrid": "futebol/futebol-internacional/futebol-espanhol/times/real-madrid/agenda-de-jogos-do-real-madrid/",
};

export function buildTeamAgendaUrl(geGloboSlug: string): string {
  const nonStandardPath = NON_STANDARD_AGENDA_PATHS[geGloboSlug];
  if (nonStandardPath) return `https://ge.globo.com/${nonStandardPath}`;
  return `https://ge.globo.com/futebol/times/${geGloboSlug}/agenda-de-jogos-do-${geGloboSlug}/`;
}

/**
 * A team's base "times/{slug}/" homepage — one directory level up from its
 * agenda page, used by newsFeedClient.ts (a different page than the agenda,
 * but under the same state-prefixed sub-portal for the same non-standard
 * teams). Derived from NON_STANDARD_AGENDA_PATHS rather than a second
 * hardcoded map: every one of its values is that same base path plus an
 * agenda-specific suffix, so truncating right after "times/{slug}/" recovers
 * it exactly, with no separate list to keep in sync.
 */
export function buildTeamHomeUrl(geGloboSlug: string): string {
  const nonStandardPath = NON_STANDARD_AGENDA_PATHS[geGloboSlug];
  if (!nonStandardPath) return `https://ge.globo.com/futebol/times/${geGloboSlug}/`;

  const marker = `times/${geGloboSlug}/`;
  const markerIndex = nonStandardPath.indexOf(marker);
  const basePath = markerIndex === -1 ? nonStandardPath : nonStandardPath.slice(0, markerIndex + marker.length);
  return `https://ge.globo.com/${basePath}`;
}

export async function fetchTeamAgenda(geGloboSlug: string): Promise<ScheduleTeamStructure> {
  const html = await fetchText(buildTeamAgendaUrl(geGloboSlug));
  return extractScheduleTeam(html);
}
