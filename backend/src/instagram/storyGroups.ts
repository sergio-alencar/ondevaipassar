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
 * (Brazilian first, Série A before B, then the rest), its matches packed into
 * as few stories as fit. A match with several channels needs a taller block
 * (two rows of logos), so a story holds three matches only when all three
 * fit without overflowing, otherwise two, or one.
 */
export function groupIntoStories(matches: MatchView[]): StoryGroup[] {
  const stories: StoryGroup[] = [];

  for (const group of groupMatchesByCompetition(matches)) {
    const competitionName = findCompetitionById(group.id)?.displayName ?? group.name;
    let current: MatchView[] = [];
    let used = 0;

    for (const match of group.matches) {
      const need = matchBlockMinHeight({ channels: match.broadcasts as unknown[] as never[] });
      if (current.length > 0 && (current.length >= MAX_MATCHES_PER_STORY || used + need > STORY_BLOCKS_HEIGHT)) {
        stories.push({ competitionId: group.id, competitionName, matches: current });
        current = [];
        used = 0;
      }
      current.push(match);
      used += need;
    }
    if (current.length > 0) stories.push({ competitionId: group.id, competitionName, matches: current });
  }
  return stories;
}
