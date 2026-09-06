import {
  findCompetitionById,
  formatDateLabel,
  formatTimeLabel,
  REGIONAL_CAVEAT_TEXT,
  REGIONAL_PRACA_CAVEAT,
  type MatchView,
} from "@ondevaipassar/shared";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { ReactNode } from "react";
import { channelLogoDataUri, competitionLogoDataUri, crestArt, loadFonts, WORDMARK, WORDMARK_WHITE } from "./assets.js";
import {
  buildCoverTree,
  buildSlideTree,
  MATCHES_PER_SLIDE,
  PORTRAIT_HEIGHT,
  PORTRAIT_WIDTH,
  type SlideMatch,
} from "./carouselTemplate.js";
import type { SatoriElement } from "./template.js";

const fonts = loadFonts();

async function render(tree: SatoriElement): Promise<Buffer> {
  const svg = await satori(tree as ReactNode, { width: PORTRAIT_WIDTH, height: PORTRAIT_HEIGHT, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: PORTRAIT_WIDTH } }).render().asPng();
}

async function toSlideMatch(match: MatchView, showCompetition: boolean): Promise<SlideMatch> {
  const [homeCrest, awayCrest] = await Promise.all([
    crestArt(match.homeTeamId, match.homeTeamCrestUrl),
    crestArt(match.awayTeamId, match.awayTeamCrestUrl),
  ]);
  return {
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    homeCrest,
    awayCrest,
    timeLabel: formatTimeLabel(match.kickoffUtc, match.kickoffTimeConfirmed),
    channels: match.broadcasts.map((broadcast) => ({
      displayName: broadcast.displayName,
      logoDataUri: channelLogoDataUri(broadcast.channelId),
      hasRegionalNote: Boolean(broadcast.regionalDetail) || broadcast.regionalCaveat === true,
    })),
    competitionLabel: showCompetition
      ? (findCompetitionById(match.competitionId)?.shortName ?? match.competitionName)
      : null,
  };
}

/**
 * The footnote lines for one slide, deduped: the real per-state list when
 * a source gave us one, and the generic disclaimer otherwise. Same wording
 * as the site and the digest (packages/shared), so a reader who checks both
 * doesn't get two different answers.
 */
function buildRegionalNotes(matches: MatchView[]): string[] {
  const notes = new Set<string>();
  for (const match of matches) {
    for (const broadcast of match.broadcasts) {
      if (broadcast.regionalDetail) {
        notes.add(`${broadcast.displayName} em: ${broadcast.regionalDetail} (${REGIONAL_PRACA_CAVEAT})`);
      } else if (broadcast.regionalCaveat) {
        notes.add(REGIONAL_CAVEAT_TEXT);
      }
    }
  }
  return [...notes];
}

/** Splits a competition's matches into slides of at most MATCHES_PER_SLIDE. */
export function chunkIntoSlides(matches: MatchView[]): MatchView[][] {
  const slides: MatchView[][] = [];
  for (let i = 0; i < matches.length; i += MATCHES_PER_SLIDE) slides.push(matches.slice(i, i + MATCHES_PER_SLIDE));
  return slides;
}

/**
 * Every image of one competition's carousel, in order: a cover, then the
 * matches 3 to a slide. Returned as buffers so the caller decides what to
 * do with them — write to disk for review, or upload.
 */
export async function renderCarouselImages(competitionId: string, competitionName: string, matches: MatchView[]): Promise<Buffer[]> {
  const dateLabel = formatDateLabel(matches[0].kickoffUtc);
  // Only worth naming per match when the post actually mixes competitions —
  // on a Série A post every slide would just repeat the header.
  const mixed = new Set(matches.map((match) => match.competitionId)).size > 1;
  const crests = await Promise.all(
    matches.flatMap((match) => [crestArt(match.homeTeamId, match.homeTeamCrestUrl), crestArt(match.awayTeamId, match.awayTeamCrestUrl)]),
  );

  const cover = await render(
    buildCoverTree({
      competitionName,
      dateLabel,
      matchCount: matches.length,
      competitionLogoDataUri: competitionLogoDataUri(competitionId),
      crests,
      wordmarkDataUri: WORDMARK_WHITE,
    }),
  );

  const slides = chunkIntoSlides(matches);
  const rendered: Buffer[] = [cover];
  for (const [index, slideMatches] of slides.entries()) {
    const slideMatchInputs = await Promise.all(slideMatches.map((match) => toSlideMatch(match, mixed)));
    rendered.push(
      await render(
        buildSlideTree({
          competitionName,
          dateLabel,
          matches: slideMatchInputs,
          wordmarkDataUri: WORDMARK,
          slideLabel: slides.length > 1 ? `${index + 1}/${slides.length}` : null,
          regionalNotes: buildRegionalNotes(slideMatches),
        }),
      ),
    );
  }
  return rendered;
}
