import {
  findCompetitionById,
  formatDateLabel,
  groupMatchesByCompetition,
  formatKickoffLabel,
  formatTimeLabel,
  REGIONAL_CAVEAT_TEXT,
  REGIONAL_PRACA_CAVEAT,
  type MatchView,
} from "@ondevaipassar/shared";

export function buildCaption(match: MatchView): string {
  const channels = match.broadcasts.map((broadcast) => broadcast.displayName).join(", ");
  const handles = match.broadcasts
    .flatMap((broadcast) => (broadcast.instagramHandle ? [`@${broadcast.instagramHandle}`] : []))
    .join(" ");

  const lines = [
    `${match.homeTeamName} x ${match.awayTeamName}`,
    match.competitionName,
    formatKickoffLabel(match.kickoffUtc, match.kickoffTimeConfirmed),
    `Transmissão: ${channels}`,
  ];

  const regionalDetailBroadcast = match.broadcasts.find((broadcast) => broadcast.regionalDetail);
  if (regionalDetailBroadcast) {
    lines.push(`* ${regionalDetailBroadcast.displayName} disponível em: ${regionalDetailBroadcast.regionalDetail} (${REGIONAL_PRACA_CAVEAT})`);
  } else if (match.broadcasts.some((broadcast) => broadcast.regionalCaveat)) {
    lines.push(`* ${REGIONAL_CAVEAT_TEXT}`);
  }

  // Omitted entirely when no broadcast in this match has a verified handle
  // yet, rather than a line with nothing on it.
  if (handles) lines.push(handles);

  return lines.join("\n");
}

/**
 * Caption for a whole competition's carousel — one line per match, in the
 * same shape the daily digest uses, plus every broadcaster's handle once.
 *
 * `part`/`totalParts` are only rendered when a competition had to be split
 * across more than one post (more matches than a carousel holds), so the
 * usual single-post case reads clean.
 */
export function buildCarouselCaption(
  competitionName: string,
  matches: MatchView[],
  part = 1,
  totalParts = 1,
): string {
  const dateLabel = formatDateLabel(matches[0].kickoffUtc);
  const heading = totalParts > 1
    ? `${competitionName} — jogos de ${dateLabel} (${part}/${totalParts})`
    : `${competitionName} — jogos de ${dateLabel}`;

  const lines = [heading, ""];
  let anyRegionalCaveat = false;

  for (const match of matches) {
    const time = formatTimeLabel(match.kickoffUtc, match.kickoffTimeConfirmed);
    const channels = match.broadcasts.map((broadcast) => broadcast.displayName).join(", ");
    lines.push(`${time} — ${match.homeTeamName} x ${match.awayTeamName} — ${channels}`);

    const detail = match.broadcasts.find((broadcast) => broadcast.regionalDetail);
    if (detail) lines.push(`   ${detail.displayName} em: ${detail.regionalDetail} (${REGIONAL_PRACA_CAVEAT})`);
    else if (match.broadcasts.some((broadcast) => broadcast.regionalCaveat)) anyRegionalCaveat = true;
  }

  if (anyRegionalCaveat) lines.push("", REGIONAL_CAVEAT_TEXT);

  // Deduped and ordered by first appearance: the same broadcaster showing
  // up in five of the day's matches should be tagged once, not five times.
  const handles = [
    ...new Set(matches.flatMap((match) => match.broadcasts.flatMap((b) => (b.instagramHandle ? [`@${b.instagramHandle}`] : [])))),
  ];
  if (handles.length > 0) lines.push("", handles.join(" "));

  return lines.join("\n");
}

/** Instagram's caption limit is 2,200 characters; a little under it, to leave room. */
const CAPTION_LIMIT = 2150;

/** The caption's own wording has no dashes (Sérgio's format): the shared note's " — " becomes a comma. */
const withoutDash = (text: string): string => text.replace(/\s+—\s+/g, ", ");

/**
 * Caption of the day's feed post, in Sérgio's format:
 *
 *   Jogos de sexta, 16/out
 *
 *   Brasileirão Série A
 *   20h Mirassol x Internacional | Premiere
 *
 *   Brasileirão Série B
 *   19h30 Ponte Preta x Atlético-GO | Disney+
 *
 *   @premiere @disneyplusbr
 *
 * No dashes anywhere: the competition's registry name on its own line, then
 * "time home x away | channels". A day of 20 matches can run past Instagram's
 * 2,200 characters, so the extras go first (the regional notes' detail, then
 * the handles) and, as a last resort, the tail is cut.
 */
export function buildDailyCaption(matches: MatchView[], part = 1, totalParts = 1): string {
  const dateLabel = formatDateLabel(matches[0].kickoffUtc);
  const heading = totalParts > 1 ? `Jogos de ${dateLabel} (${part}/${totalParts})` : `Jogos de ${dateLabel}`;

  const build = (withHandles: boolean, withRegionalDetail: boolean): string => {
    const lines = [heading];
    let anyRegionalCaveat = false;

    for (const group of groupMatchesByCompetition(matches)) {
      lines.push("", findCompetitionById(group.id)?.displayName ?? group.name);
      for (const match of group.matches) {
        const time = formatTimeLabel(match.kickoffUtc, match.kickoffTimeConfirmed);
        const channels = match.broadcasts.map((broadcast) => broadcast.displayName).join(", ");
        lines.push(`${time} ${match.homeTeamName} x ${match.awayTeamName} | ${channels}`);

        const detail = match.broadcasts.find((broadcast) => broadcast.regionalDetail);
        if (detail && withRegionalDetail) lines.push(`${detail.displayName} em ${detail.regionalDetail} (${REGIONAL_PRACA_CAVEAT})`);
        else if (match.broadcasts.some((broadcast) => broadcast.regionalCaveat || broadcast.regionalDetail)) anyRegionalCaveat = true;
      }
    }

    if (anyRegionalCaveat) lines.push("", withoutDash(REGIONAL_CAVEAT_TEXT));

    const handles = [
      ...new Set(matches.flatMap((match) => match.broadcasts.flatMap((b) => (b.instagramHandle ? [`@${b.instagramHandle}`] : [])))),
    ];
    if (withHandles && handles.length > 0) lines.push("", handles.join(" "));
    return lines.join("\n");
  };

  for (const [handles, detail] of [[true, true], [true, false], [false, false]] as const) {
    const caption = build(handles, detail);
    if (caption.length <= CAPTION_LIMIT) return caption;
  }
  const cut = build(false, false).slice(0, CAPTION_LIMIT);
  return `${cut.slice(0, cut.lastIndexOf("\n"))}\n…`;
}
