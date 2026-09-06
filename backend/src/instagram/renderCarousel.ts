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
import { EUROPE_GROUP_ID, EUROPE_GROUP_NAME } from "./postGroups.js";
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

/**
 * Drops the "(Fem.)" that distinguishes a women's team from the men's side
 * of the same club. The registry needs it — "Grêmio" and "Grêmio (Fem.)"
 * are two rows — but inside a Brasileirão Feminino carousel every match is
 * women's football, so it's noise on every line.
 */
function displayTeamName(name: string): string {
  return name.replace(/\s*\(Fem\.\)\s*$/i, "");
}

async function toSlideMatch(match: MatchView, showCompetition: boolean, notes: SlideNotes): Promise<SlideMatch> {
  const [homeCrest, awayCrest] = await Promise.all([
    crestArt(match.homeTeamId, match.homeTeamCrestUrl),
    crestArt(match.awayTeamId, match.awayTeamCrestUrl),
  ]);
  return {
    homeTeamName: displayTeamName(match.homeTeamName),
    awayTeamName: displayTeamName(match.awayTeamName),
    homeCrest,
    awayCrest,
    timeLabel: formatTimeLabel(match.kickoffUtc, match.kickoffTimeConfirmed),
    channels: match.broadcasts.map((broadcast) => ({
      displayName: broadcast.displayName,
      logoDataUri: channelLogoDataUri(broadcast.channelId),
      regionalMarker: broadcast.regionalDetail
        ? notes.markerFor(broadcast.regionalDetail)
        : broadcast.regionalCaveat
          ? "*"
          : "",
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
/** "*", "**", ... — one per distinct note on a slide, so two Globo entries with different state lists aren't both marked with the same asterisk. */
function marker(index: number): string {
  return "*".repeat(index + 1);
}

interface SlideNotes {
  /** The footnote lines, markers included, in the order they're marked. */
  lines: string[];
  /** Marker for a given regionalDetail, or "" for a broadcast that needs none. */
  markerFor: (regionalDetail: string | null | undefined) => string;
}

function buildRegionalNotes(matches: MatchView[]): SlideNotes {
  const details: string[] = [];
  const names = new Map<string, string>();
  let genericOnly = false;

  for (const match of matches) {
    for (const broadcast of match.broadcasts) {
      if (broadcast.regionalDetail) {
        if (!details.includes(broadcast.regionalDetail)) details.push(broadcast.regionalDetail);
        names.set(broadcast.regionalDetail, broadcast.displayName);
      } else if (broadcast.regionalCaveat) {
        genericOnly = true;
      }
    }
  }

  const lines = details.map((detail, index) => `${marker(index)} ${names.get(detail)} em: ${detail}`);
  if (genericOnly) lines.push(REGIONAL_CAVEAT_TEXT);
  // The "varies by praça" caveat applies to every line above equally, so it
  // goes once at the end instead of being repeated on each — with two Globo
  // entries on one slide it was printed twice.
  if (details.length > 0) lines.push(`A cobertura ${REGIONAL_PRACA_CAVEAT}.`);

  return {
    lines,
    markerFor: (detail) => {
      if (!detail) return "";
      const index = details.indexOf(detail);
      return index === -1 ? "" : marker(index);
    },
  };
}

/** Splits a competition's matches into slides of at most MATCHES_PER_SLIDE. */
export function chunkIntoSlides(matches: MatchView[]): MatchView[][] {
  const slides: MatchView[][] = [];
  for (let i = 0; i < matches.length; i += MATCHES_PER_SLIDE) slides.push(matches.slice(i, i + MATCHES_PER_SLIDE));
  return slides;
}

/** Header/cover name for a group: the competition's short name, or the synthetic one for the combined European post. */
function groupName(competitionId: string, matches: MatchView[]): string {
  if (competitionId === EUROPE_GROUP_ID) return EUROPE_GROUP_NAME;
  const competition = findCompetitionById(competitionId);
  return competition?.shortName ?? competition?.displayName ?? matches[0].competitionName;
}

/** The carousel's first image. `matches` is the whole group, since the cover shows every club playing. */
export async function renderCoverImage(competitionId: string, matches: MatchView[]): Promise<Buffer> {
  const crests = await Promise.all(
    matches.flatMap((match) => [
      crestArt(match.homeTeamId, match.homeTeamCrestUrl),
      crestArt(match.awayTeamId, match.awayTeamCrestUrl),
    ]),
  );
  return render(
    buildCoverTree({
      competitionName: groupName(competitionId, matches),
      dateLabel: formatDateLabel(matches[0].kickoffUtc),
      matchCount: matches.length,
      competitionLogoDataUri: competitionLogoDataUri(competitionId),
      crests,
      wordmarkDataUri: WORDMARK_WHITE,
    }),
  );
}

/** One slide of matches. `matches` is just that slide's own share of the group. */
export async function renderSlideImage(
  competitionId: string,
  matches: MatchView[],
  slideLabel: string | null,
  mixed: boolean,
): Promise<Buffer> {
  const notes = buildRegionalNotes(matches);
  const slideMatches = await Promise.all(matches.map((match) => toSlideMatch(match, mixed, notes)));
  return render(
    buildSlideTree({
      competitionName: groupName(competitionId, matches),
      dateLabel: formatDateLabel(matches[0].kickoffUtc),
      matches: slideMatches,
      wordmarkDataUri: WORDMARK,
      slideLabel,
      regionalNotes: notes.lines,
    }),
  );
}

/**
 * Every image of one competition's carousel, in order: a cover, then the
 * matches 2 to a slide. Used by scripts/carousel-preview.ts to render a
 * whole day locally; the poster itself goes through the per-image
 * functions above, via /api/instagram-slide.
 */
export async function renderCarouselImages(competitionId: string, matches: MatchView[]): Promise<Buffer[]> {
  const slides = chunkIntoSlides(matches);
  const mixed = new Set(matches.map((match) => match.competitionId)).size > 1;

  const images = [await renderCoverImage(competitionId, matches)];
  for (const [index, slideMatches] of slides.entries()) {
    images.push(
      await renderSlideImage(competitionId, slideMatches, slides.length > 1 ? `${index + 1}/${slides.length}` : null, mixed),
    );
  }
  return images;
}
