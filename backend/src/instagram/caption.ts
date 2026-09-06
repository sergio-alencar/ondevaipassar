import {
  formatDateLabel,
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
