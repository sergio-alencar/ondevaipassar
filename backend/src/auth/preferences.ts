import { listChannels, TEAMS, type Preferences } from "@ondevaipassar/shared";
import { z } from "zod";

const bodySchema = z.object({
  teams: z.array(z.string().max(100)).max(500),
  channels: z.array(z.string().max(100)).max(500),
});

const TEAM_IDS = new Set(TEAMS.map((team) => team.id));
const CHANNEL_IDS = new Set(listChannels().map((channel) => channel.id));

/**
 * A request body turned into preferences safe to store, or null when it isn't
 * the right shape. Beyond shape, ids that aren't in the registry are dropped
 * and duplicates collapsed: this is user-controlled input going into a
 * database column, and an id we don't know can only be stale or hostile.
 */
export function sanitizePreferences(body: unknown): Preferences | null {
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return null;
  const keep = (ids: string[], known: Set<string>) => [...new Set(ids.filter((id) => known.has(id)))];
  return { teams: keep(parsed.data.teams, TEAM_IDS), channels: keep(parsed.data.channels, CHANNEL_IDS) };
}
