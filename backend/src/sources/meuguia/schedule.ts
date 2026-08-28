export interface ScheduleEntry {
  homeTeamNameRaw: string;
  awayTeamNameRaw: string;
  /** Rough kickoff/start time straight from the grid — never trusted as *the* real kickoff, only used to pick which already-ingested match this is (see broadcastMatching.ts). */
  startTimeUtc: string;
}

// One page (e.g. meuguia.tv/programacao/canal/ESP) is a single flat <li>
// list mixing day-header rows and program rows, confirmed live — day
// headers look like <li class="subheader devicepadding">sexta-feira, 28/8</li>
// and program rows are
//   <li><a title="..."><div class='lileft time'>15:50</div>
//     <div class="licontent"><h2>Aston Villa x Arsenal - Ao Vivo</h2>
//     <h3>Esporte/Futebol</h3></div></a></li>
// — matched together (not two separate regexes) so this can walk the page
// once in document order and track "which day are we in right now" as it
// goes, the same way the markup itself only says the day once per group.
// The page also has commented-out Rails ERB template source
// (<!-- <% ... %> -->) sprinkled through it that looks superficially
// similar (literally contains "dia_semana(...)") — this pattern doesn't
// match any of that, since the real subheader's content between the <li>
// tags is plain text, never <% %>.
const ENTRY_PATTERN =
  /<li class="subheader devicepadding">([^<]+)<\/li>|<div class='lileft time'>([^<]+)<\/div>\s*<div class="licontent">\s*<h2>([^<]+)<\/h2>\s*<h3>([^<]+)<\/h3>/g;

const DAY_HEADER_DATE_PATTERN = /(\d{1,2})\/(\d{1,2})\s*$/;

// A recorded highlights rerun is titled "VT - {teams}" (prefix, no " - Ao
// Vivo" suffix) — confirmed live, distinct enough from a live broadcast
// that requiring this suffix alone excludes those without needing a
// separate "VT" blocklist. An optional "{Competition name}: " prefix
// (confirmed live: "Campeonato Brasileiro Série B: Botafogo-SP x Cuiabá -
// Ao Vivo") is stripped so it doesn't get captured as part of the home
// team's own name.
const LIVE_MATCH_TITLE_PATTERN = /^(?:[^:]+:\s*)?(.+?) x (.+?) - Ao Vivo$/;

const FOOTBALL_CATEGORY = "Esporte/Futebol";

/**
 * Parses one channel's schedule page into live football entries. `now` is
 * only used to seed the year (the grid's own day headers are "D/M", no
 * year) — overridable so a test fixture frozen at a real past date parses
 * deterministically regardless of when the test actually runs.
 */
export function parseSchedule(html: string, now: Date = new Date()): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];
  let currentDay: number | null = null;
  let currentMonth: number | null = null;
  let currentYear = now.getFullYear();
  let lastMonth: number | null = null;

  for (const match of html.matchAll(ENTRY_PATTERN)) {
    const [, dayHeader, time, title, category] = match;

    if (dayHeader !== undefined) {
      const dateMatch = dayHeader.match(DAY_HEADER_DATE_PATTERN);
      if (!dateMatch) continue;
      const [, dayStr, monthStr] = dateMatch;
      const month = Number(monthStr);
      // The grid always runs forward from today — a month going *backwards*
      // mid-page only happens by wrapping into next year (e.g. Dec -> Jan).
      if (lastMonth !== null && month < lastMonth) currentYear++;
      lastMonth = month;
      currentDay = Number(dayStr);
      currentMonth = month;
      continue;
    }

    if (category?.trim() !== FOOTBALL_CATEGORY || currentDay === null || currentMonth === null) continue;
    const titleMatch = title?.match(LIVE_MATCH_TITLE_PATTERN);
    if (!titleMatch) continue;

    const [hourStr, minuteStr] = time?.trim().split(":") ?? [];
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;

    // Brazil has used a fixed UTC-3 offset (no DST) since 2019 — same
    // assumption used throughout this codebase for a BRT-labeled time.
    const startTimeUtc = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay, hour + 3, minute)).toISOString();

    entries.push({ homeTeamNameRaw: titleMatch[1].trim(), awayTeamNameRaw: titleMatch[2].trim(), startTimeUtc });
  }

  return entries;
}
