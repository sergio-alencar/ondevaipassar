import {
  formatDateLabel,
  formatTimeLabel,
  groupMatchesByCompetition,
  REGIONAL_CAVEAT_TEXT,
  REGIONAL_PRACA_CAVEAT,
  type MatchView,
} from "@ondevaipassar/shared";

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

// Marks a channel you can watch without paying. An emoji rather than a
// "(grátis)" suffix because a line can carry three of them, and three
// parenthesised words next to each other stop being scannable — which is the
// only reason the digest exists. Safe alongside REGIONAL_MARK's reasoning
// too: it isn't an asterisk, so WhatsApp's bold markup stays intact.
const FREE_MARK = "🆓";
/**
 * Which day the digest is about. Needed because `date` alone can't say it:
 * a Saturday-evening pull of tomorrow's listing was rendering "jogos de
 * hoje — domingo, 6/set", which is wrong in the one place a reader can't
 * check it against anything.
 */
export type DigestDay = "hoje" | "amanhã";

const REGIONAL_FOOTNOTE = `${REGIONAL_MARK} — ${REGIONAL_CAVEAT_TEXT}`;
// Spelled out once per digest, and only when something actually carried
// the mark — the emoji reads as "FREE", which is close enough to guess but
// not close enough to leave unsaid.
const FREE_FOOTNOTE = `${FREE_MARK} — dá pra assistir de graça`;

interface MatchLine {
  text: string;
  /** Indented sub-line naming the exact states a broadcast covers, when the source gave us that detail. */
  regionalDetail: string | null;
  usedRegionalMark: boolean;
  usedFreeMark: boolean;
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
    return { text: `${time} ${pairing} — ${NO_BROADCAST_TEXT}`, regionalDetail: null, usedRegionalMark: false, usedFreeMark: false };
  }

  // Handled per broadcast, not per match (unlike the Instagram caption):
  // one line here lists several channels, and each can be in a different
  // situation — one with real per-state data, another with only the
  // generic disclaimer.
  let usedRegionalMark = false;
  let usedFreeMark = false;
  let regionalDetail: string | null = null;

  const channels = match.broadcasts.map((broadcast) => {
    // The free mark goes right after the name, before any regional note:
    // "de graça" is a property of the channel, "(regional)" a caveat about
    // this particular coverage.
    let name = broadcast.displayName;
    if (broadcast.free) {
      usedFreeMark = true;
      name = `${name} ${FREE_MARK}`;
    }
    if (broadcast.regionalDetail) {
      regionalDetail ??= `   📍 ${broadcast.displayName} em: ${broadcast.regionalDetail} (${REGIONAL_PRACA_CAVEAT})`;
      return name;
    }
    if (broadcast.regionalCaveat) {
      usedRegionalMark = true;
      return `${name} ${REGIONAL_MARK}`;
    }
    return name;
  });

  // No "Transmissão:" label — it would repeat on every single line, and the
  // header already says what the list is. The label survives only in
  // NO_BROADCAST_TEXT, where "Transmissão a confirmar" is the information
  // itself rather than a heading, and matches the site's own wording.
  //
  // No dash after the time either (Sérgio's call): one dash separating the
  // match from its channels reads cleanly, two made the line look like
  // three equal parts.
  return { text: `${time} ${pairing} — ${channels.join(", ")}`, regionalDetail, usedRegionalMark, usedFreeMark };
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
  let anyFreeMark = false;

  for (const group of groupMatchesByCompetition(matches)) {
    const lines = [`*${group.name}*`];
    for (const match of group.matches) {
      const line = buildMatchLine(match, true);
      lines.push(line.text);
      if (line.regionalDetail) lines.push(line.regionalDetail);
      if (line.usedRegionalMark) anyRegionalMark = true;
      if (line.usedFreeMark) anyFreeMark = true;
    }
    sections.push(lines.join("\n"));
  }

  const parts = [header, "", sections.join("\n\n")];
  const footnotes = [
    ...(anyFreeMark ? [FREE_FOOTNOTE] : []),
    ...(anyRegionalMark ? [REGIONAL_FOOTNOTE] : []),
  ];
  if (footnotes.length > 0) parts.push("", footnotes.join("\n"));
  parts.push("", `Mais detalhes: ${SITE_URL}`);
  return parts.join("\n");
}
