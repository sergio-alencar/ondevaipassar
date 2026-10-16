import {
  findCompetitionById,
  formatDateLabel,
  formatTimeLabel,
  REGIONAL_CAVEAT_TEXT,
  REGIONAL_PRACA_CAVEAT,
  teamNameInCompetition,
  type MatchView,
} from "@ondevaipassar/shared";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { ReactNode } from "react";
import { channelLogoDataUri, competitionBadgeDataUri, competitionLogoDataUri, crestArt, loadFonts, WORDMARK, WORDMARK_WHITE } from "./assets.js";
import { DAILY_GROUP_ID, DAILY_GROUP_NAME, EUROPE_GROUP_ID, EUROPE_GROUP_NAME } from "./postGroups.js";
import {
  buildCoverTree,
  buildSlideTree,
  buildStoryTree,
  MATCHES_PER_SLIDE,
  PORTRAIT_HEIGHT,
  PORTRAIT_WIDTH,
  STORY_HEIGHT,
  STORY_WIDTH,
  type SlideMatch,
} from "./carouselTemplate.js";
import type { SatoriElement } from "./template.js";

const fonts = loadFonts();

async function render(tree: SatoriElement, width = PORTRAIT_WIDTH, height = PORTRAIT_HEIGHT): Promise<Buffer> {
  const svg = await satori(tree as ReactNode, { width, height, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
}

/**
 * Team name as it reads on a slide: "(Fem.)" is dropped inside a women's
 * competition (see teamNameInCompetition). A slide's matches share one
 * competition, except on the combined European one, which is all men's.
 */
function displayTeamName(name: string, competitionName: string): string {
  return teamNameInCompetition(name, competitionName);
}

async function toSlideMatch(match: MatchView, showCompetition: boolean, notes: SlideNotes): Promise<SlideMatch> {
  const [homeCrest, awayCrest] = await Promise.all([
    crestArt(match.homeTeamId, match.homeTeamCrestUrl),
    crestArt(match.awayTeamId, match.awayTeamCrestUrl),
  ]);
  return {
    homeTeamName: displayTeamName(match.homeTeamName, match.competitionName),
    awayTeamName: displayTeamName(match.awayTeamName, match.competitionName),
    homeCrest,
    awayCrest,
    timeLabel: formatTimeLabel(match.kickoffUtc, match.kickoffTimeConfirmed),
    channels: match.broadcasts.map((broadcast) => ({
      displayName: broadcast.displayName,
      logoDataUri: channelLogoDataUri(broadcast.channelId),
      free: broadcast.free,
      regionalMarker: broadcast.regionalDetail
        ? notes.markerFor(broadcast.regionalDetail)
        : broadcast.regionalCaveat
          ? "*"
          : "",
    })),
    competitionBadge: showCompetition ? competitionBadgeDataUri(match.competitionId) : null,
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

/**
 * The competition a group is really about. The combined European post stays
 * "Jogos da Europa" while it mixes competitions, but when every match in it
 * belongs to one (a Champions League night) that competition is what the cover
 * and header should name, with its own logo.
 */
function effectiveCompetitionId(competitionId: string, matches: MatchView[]): string {
  if (competitionId !== EUROPE_GROUP_ID) return competitionId;
  const ids = new Set(matches.map((match) => match.competitionId));
  return ids.size === 1 ? matches[0].competitionId : competitionId;
}

/** Header/cover name for a group: the competition's short name, or the synthetic one for the combined European post. */
function groupName(competitionId: string, matches: MatchView[]): string {
  if (competitionId === EUROPE_GROUP_ID) return EUROPE_GROUP_NAME;
  if (competitionId === DAILY_GROUP_ID) return DAILY_GROUP_NAME;
  const competition = findCompetitionById(competitionId);
  return competition?.shortName ?? competition?.displayName ?? matches[0].competitionName;
}

/** The text to print under a competition's logo, or null when the logo says enough by itself (see Competition.logoCaption). */
function logoCaptionFor(competitionId: string): string | null {
  return findCompetitionById(competitionId)?.logoCaption ?? null;
}

/** Competitions whose cover logo is just the organiser's badge (UEFA), so the tournament's name is printed under it. */
const ORGANISER_LOGO_COMPETITIONS: ReadonlySet<string> = new Set(["eliminatorias-copa-do-mundo-feminina-uefa"]);

/** The carousel's first image. `matches` is the whole group, since the cover shows every club playing. */
export async function renderCoverImage(groupId: string, matches: MatchView[]): Promise<Buffer> {
  const competitionId = effectiveCompetitionId(groupId, matches);
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
      // A single competition without its own art keeps the generic European one.
      competitionLogoDataUri: competitionLogoDataUri(competitionId) ?? competitionLogoDataUri(groupId),
      logoCaption: logoCaptionFor(competitionId),
      titleUnderLogo: ORGANISER_LOGO_COMPETITIONS.has(competitionId),
      crests,
      wordmarkDataUri: WORDMARK_WHITE,
    }),
  );
}

/** One slide of matches. `matches` is just that slide's own share of the group. */
export async function renderSlideImage(
  groupId: string,
  matches: MatchView[],
  slideLabel: string | null,
  mixed: boolean,
): Promise<Buffer> {
  // `mixed` is about the whole post: a slide that happens to hold one competition still belongs to a mixed European post.
  const competitionId = mixed ? groupId : effectiveCompetitionId(groupId, matches);
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
  // The day's post names each match's competition even on a one-competition day.
  const mixed = competitionId === DAILY_GROUP_ID || new Set(matches.map((match) => match.competitionId)).size > 1;

  const images = [await renderCoverImage(competitionId, matches)];
  for (const [index, slideMatches] of slides.entries()) {
    images.push(
      await renderSlideImage(competitionId, slideMatches, slides.length > 1 ? `${index + 1}/${slides.length}` : null, mixed),
    );
  }
  return images;
}

/** One story image (9:16): a competition's matches, its name and logo on top. */
export async function renderStoryImage(competitionId: string, matches: MatchView[]): Promise<Buffer> {
  const notes = buildRegionalNotes(matches);
  const storyMatches = await Promise.all(matches.map((match) => toSlideMatch(match, false, notes)));
  const competition = findCompetitionById(competitionId);
  return render(
    buildStoryTree({
      competitionName: competition?.displayName ?? matches[0].competitionName,
      competitionBadge: competitionBadgeDataUri(competitionId),
      dateLabel: formatDateLabel(matches[0].kickoffUtc),
      matches: storyMatches,
      wordmarkDataUri: WORDMARK,
    }),
    STORY_WIDTH,
    STORY_HEIGHT,
  );
}
