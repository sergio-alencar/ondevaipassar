import { findCompetitionById, groupMatchesByCompetition, type MatchView } from "@ondevaipassar/shared";
import { MAX_MATCHES_PER_STORY, matchBlockMinHeight, STORY_BLOCKS_HEIGHT } from "./carouselTemplate.js";

/** One story: a single competition's matches, as many as fit one 9:16 image (never more than three). */
export interface StoryGroup {
  competitionId: string;
  competitionName: string;
  matches: MatchView[];
}

/**
 * The day's stories: one competition at a time, in the digest's order
 * (Brazilian first, Série A before B, then the rest). Within a competition the
 * matches are split EVENLY over the fewest stories that fit: four Série A games
 * make two stories of two, never three and one. A match with several channels
 * needs a taller block (two rows of logos), so a story holds three matches only
 * when they fit without overflowing, otherwise two, or one.
 */
export function groupIntoStories(matches: MatchView[]): StoryGroup[] {
  const stories: StoryGroup[] = [];

  for (const group of groupMatchesByCompetition(matches)) {
    const competitionName = findCompetitionById(group.id)?.displayName ?? group.name;
    const parts = evenParts(group.matches);
    for (const part of parts) stories.push({ competitionId: group.id, competitionName, matches: part });
  }
  return stories;
}

/** Does this set of matches fit one story: at most three, and their blocks within the story's height. */
function fitsOneStory(matches: MatchView[]): boolean {
  if (matches.length > MAX_MATCHES_PER_STORY) return false;
  return matches.reduce((total, match) => total + matchBlockMinHeight({ channels: match.broadcasts as unknown[] as never[] }), 0) <= STORY_BLOCKS_HEIGHT;
}

/**
 * The fewest parts, as equal in size as possible (sizes differ by at most one,
 * the larger first, in the original order), where every part fits one story.
 * A single match always counts as fitting, however tall its block.
 */
function evenParts(matches: MatchView[]): MatchView[][] {
  for (let count = Math.ceil(matches.length / MAX_MATCHES_PER_STORY); count <= matches.length; count++) {
    const base = Math.floor(matches.length / count);
    const remainder = matches.length % count;
    const parts: MatchView[][] = [];
    let index = 0;
    for (let part = 0; part < count; part++) {
      const size = base + (part < remainder ? 1 : 0);
      parts.push(matches.slice(index, index + size));
      index += size;
    }
    if (parts.every((part) => part.length === 1 || fitsOneStory(part))) return parts;
  }
  return matches.map((match) => [match]);
}
