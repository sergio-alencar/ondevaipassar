import { COMPETITIONS, listChannels, TEAMS, type Preferences } from "@ondevaipassar/shared";
import { z } from "zod";

const bodySchema = z.object({
  teams: z.array(z.string().max(100)).max(500),
  // Optional: a browser still running the version of the site from before
  // competitions could be followed sends no such field, and that must not wipe
  // what the account already holds.
  competitions: z.array(z.string().max(100)).max(500).optional(),
  channels: z.array(z.string().max(100)).max(500),
});

const TEAM_IDS = new Set(TEAMS.map((team) => team.id));
const COMPETITION_IDS = new Set(COMPETITIONS.map((competition) => competition.id));
const CHANNEL_IDS = new Set(listChannels().map((channel) => channel.id));

/**
 * A request body turned into preferences safe to store, or null when it isn't
 * the right shape. Beyond shape, ids that aren't in the registry are dropped
 * and duplicates collapsed: this is user-controlled input going into a
 * database column, and an id we don't know can only be stale or hostile.
 * `storedCompetitions` stands in when the body carries no competitions field.
 */
export function sanitizePreferences(body: unknown, storedCompetitions: string[] = []): Preferences | null {
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return null;
  const keep = (ids: string[], known: Set<string>) => [...new Set(ids.filter((id) => known.has(id)))];
  return {
    teams: keep(parsed.data.teams, TEAM_IDS),
    competitions: parsed.data.competitions === undefined ? storedCompetitions : keep(parsed.data.competitions, COMPETITION_IDS),
    channels: keep(parsed.data.channels, CHANNEL_IDS),
  };
}
