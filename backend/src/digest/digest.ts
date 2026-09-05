import { findCompetitionById, formatDateLabel, formatTimeLabel, type MatchView } from "@ondevaipassar/shared";

const SITE_URL = "https://ondevaipassar.com";

// Same wording the site itself uses when a match has no confirmed channel
// (frontend/src/pages/MatchBroadcasts.tsx) — a digest saying something
// different from the page it links to would read as two different answers.
const NO_BROADCAST_TEXT = "Transmissão a confirmar";

// Marks a channel whose coverage varies by region when we DON'T have the
// real per-state list. Deliberately not a bare "*": WhatsApp reads "*" as
// its own bold-toggle, so a stray one silently mangles the formatting of
// everything after it.
const REGIONAL_MARK = "(regional)";
/**
 * Which day the digest is about. Needed because `date` alone can't say it:
 * a Saturday-evening pull of tomorrow's listing was rendering "jogos de
 * hoje — domingo, 6/set", which is wrong in the one place a reader can't
 * check it against anything.
 */
export type DigestDay = "hoje" | "amanhã";

const REGIONAL_FOOTNOTE = `${REGIONAL_MARK} = transmissão pela Globo pode variar por região — confira a programação local`;

interface CompetitionGroup {
  id: string;
  name: string;
  foreign: boolean;
  priority: number;
  matches: MatchView[];
}

/**
 * Ordering, outermost rule first: competitions with Brazilian clubs before
 * foreign ones (see Competition.foreign); then pinned competitions in their
 * set order (Competition.priority — Série A, B, C); then everything else in
 * the order it first appears, which for a kickoff-sorted list means
 * chronological.
 *
 * Both exceptions came from running this against a real Saturday: European
 * leagues kick off in the morning, so pure chronological order put Premier
 * League, Bundesliga and La Liga above Brasileirão; and within the Brazilian
 * block, Série C's 9h match put it above Série A.
 */
function groupByCompetition(matches: MatchView[]): CompetitionGroup[] {
  const groups = new Map<string, CompetitionGroup>();
  for (const match of matches) {
    const competition = findCompetitionById(match.competitionId);
    const group = groups.get(match.competitionId) ?? {
      id: match.competitionId,
      name: match.competitionName,
      foreign: competition?.foreign === true,
      // Unpinned competitions keep the order they first appear in, which
      // (the list being sorted by kickoff) means chronological.
      priority: competition?.priority ?? Number.MAX_SAFE_INTEGER,
      matches: [],
    };
    group.matches.push(match);
    groups.set(match.competitionId, group);
  }

  // Array#sort is stable per spec, so same-priority groups keep the
  // chronological order they were inserted in.
  const byPriority = (toSort: CompetitionGroup[]): CompetitionGroup[] => [...toSort].sort((a, b) => a.priority - b.priority);
  const ordered = [...groups.values()];
  return [...byPriority(ordered.filter((group) => !group.foreign)), ...byPriority(ordered.filter((group) => group.foreign))];
}

interface MatchLine {
  text: string;
  /** Indented sub-line naming the exact states a broadcast covers, when the source gave us that detail. */
  regionalDetail: string | null;
  usedRegionalMark: boolean;
}

/**
 * `bold` wraps the team pairing in WhatsApp's own `*bold*` markup. X has no
 * text formatting at all, so there the asterisks would show up literally —
 * hence the flag rather than one shared string.
 */
function buildMatchLine(match: MatchView, bold: boolean): MatchLine {
  const time = formatTimeLabel(match.kickoffUtc, match.kickoffTimeConfirmed);
  const pairing = bold ? `*${match.homeTeamName} x ${match.awayTeamName}*` : `${match.homeTeamName} x ${match.awayTeamName}`;

  if (match.broadcasts.length === 0) {
    return { text: `${time} — ${pairing} — ${NO_BROADCAST_TEXT}`, regionalDetail: null, usedRegionalMark: false };
  }

  // Handled per broadcast, not per match (unlike the Instagram caption):
  // one line here lists several channels, and each can be in a different
  // situation — one with real per-state data, another with only the
  // generic disclaimer.
  let usedRegionalMark = false;
  let regionalDetail: string | null = null;

  const channels = match.broadcasts.map((broadcast) => {
    if (broadcast.regionalDetail) {
      regionalDetail ??= `   📍 ${broadcast.displayName} em: ${broadcast.regionalDetail}`;
      return broadcast.displayName;
    }
    if (broadcast.regionalCaveat) {
      usedRegionalMark = true;
      return `${broadcast.displayName} ${REGIONAL_MARK}`;
    }
    return broadcast.displayName;
  });

  return { text: `${time} — ${pairing} — Transmissão: ${channels.join(", ")}`, regionalDetail, usedRegionalMark };
}

/**
 * The full day's listing, grouped by competition — for the WhatsApp
 * channel, where there's no practical length limit and the point is that a
 * reader finds their own team without leaving the app. `now` feeds the
 * header date and is needed even when there are no matches at all.
 */
export function buildDigest(matches: MatchView[], date: Date = new Date(), day: DigestDay = "hoje"): string {
  const header = `⚽ *Onde assistir aos jogos de ${day} — ${formatDateLabel(date.toISOString())}*`;

  if (matches.length === 0) {
    return [header, "", `Nenhum jogo ${day}.`, "", SITE_URL].join("\n");
  }

  const sections: string[] = [];
  let anyRegionalMark = false;

  for (const group of groupByCompetition(matches)) {
    const lines = [`*${group.name}*`];
    for (const match of group.matches) {
      const line = buildMatchLine(match, true);
      lines.push(line.text);
      if (line.regionalDetail) lines.push(line.regionalDetail);
      if (line.usedRegionalMark) anyRegionalMark = true;
    }
    sections.push(lines.join("\n"));
  }

  const parts = [header, "", sections.join("\n\n")];
  if (anyRegionalMark) parts.push("", REGIONAL_FOOTNOTE);
  parts.push("", `Mais detalhes: ${SITE_URL}`);
  return parts.join("\n");
}

export const X_CHARACTER_LIMIT = 280;

/**
 * The same full listing as buildDigest, split into a thread: one post per
 * competition, and a competition with more matches than fit in 280
 * characters spills into further posts of its own (its header repeated with
 * "cont."), so a post never breaks mid-match.
 *
 * Numbering ("1/6") is part of each post rather than something the reader
 * infers, since these are pasted by hand one at a time and a thread posted
 * out of order is silently wrong. The count is known before numbering is
 * applied, so the width it needs is reserved up front — otherwise adding
 * "10/12" to an already-full post would push it over the limit.
 */
export function buildThreadDigest(matches: MatchView[], date: Date = new Date(), day: DigestDay = "hoje"): string[] {
  const dateLabel = formatDateLabel(date.toISOString());
  const opener = `⚽ Onde assistir aos jogos de ${day} — ${dateLabel}`;

  if (matches.length === 0) {
    return [[opener, "", `Nenhum jogo ${day}.`, "", SITE_URL].join("\n")];
  }

  const bodies: string[] = [`${opener}\n\n${matches.length} ${matches.length === 1 ? "jogo" : "jogos"}. Onde passa cada um 🧵`];
  let anyRegionalMark = false;

  for (const group of groupByCompetition(matches)) {
    const lines: string[] = [];
    for (const match of group.matches) {
      const line = buildMatchLine(match, false);
      lines.push(line.regionalDetail ? `${line.text}\n${line.regionalDetail}` : line.text);
      if (line.usedRegionalMark) anyRegionalMark = true;
    }
    bodies.push(...packIntoPosts(group.name, lines));
  }

  const closing = [`Lista completa e detalhes de cada jogo:`, SITE_URL];
  if (anyRegionalMark) closing.unshift(REGIONAL_FOOTNOTE, "");
  bodies.push(closing.join("\n"));

  // Reserve the numbering width against the widest suffix any post will get
  // (the last one), so no post can overflow once numbered.
  return bodies.map((body, index) => `${body}\n\n${index + 1}/${bodies.length}`);
}

/** Splits one competition's lines across as many posts as it takes, never breaking a match across two. */
function packIntoPosts(competitionName: string, lines: string[]): string[] {
  const posts: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const header = posts.length === 0 ? competitionName : `${competitionName} (cont.)`;
    posts.push([header, ...current].join("\n"));
    current = [];
  };

  for (const line of lines) {
    const header = posts.length === 0 && current.length === 0 ? competitionName : `${competitionName} (cont.)`;
    const candidate = [header, ...current, line].join("\n");
    // NUMBERING_BUDGET leaves room for the "\n\n12/13" suffix added later.
    if (current.length > 0 && countCharacters(candidate) > X_CHARACTER_LIMIT - NUMBERING_BUDGET) {
      flush();
    }
    current.push(line);
  }
  flush();
  return posts;
}

// "\n\n" plus a generous "99/99" — a digest never gets near that many posts,
// and over-reserving a few characters is free next to a post that X rejects.
const NUMBERING_BUDGET = 9;

/**
 * X counts by Unicode code point, not UTF-16 code unit — an emoji outside
 * the BMP is 2 in JavaScript's own `.length` but 1 here, so counting the
 * naive way would make us trim posts that actually fit. (X also weights
 * some ranges differently for CJK; irrelevant for pt-BR text.)
 */
export function countCharacters(text: string): number {
  return [...text].length;
}
