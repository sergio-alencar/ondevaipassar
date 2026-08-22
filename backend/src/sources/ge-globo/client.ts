import { fetchText } from "../../http/client.js";
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
function extractBalancedJsonObject(source: string, openBraceIndex: number): string {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openBraceIndex; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return source.slice(openBraceIndex, i + 1);
    }
  }
  throw new Error("Unbalanced braces while extracting ge.globo scheduleTeam JSON");
}

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
};

export function buildTeamAgendaUrl(geGloboSlug: string): string {
  const nonStandardPath = NON_STANDARD_AGENDA_PATHS[geGloboSlug];
  if (nonStandardPath) return `https://ge.globo.com/${nonStandardPath}`;
  return `https://ge.globo.com/futebol/times/${geGloboSlug}/agenda-de-jogos-do-${geGloboSlug}/`;
}

export async function fetchTeamAgenda(geGloboSlug: string): Promise<ScheduleTeamStructure> {
  const html = await fetchText(buildTeamAgendaUrl(geGloboSlug));
  return extractScheduleTeam(html);
}
