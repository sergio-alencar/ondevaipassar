import { z } from "zod";

// Apollo Client's normalized cache: a flat dict keyed by "Typename:id" (or a
// stringified-args variant for parameterized fields), where object-valued
// fields that reference another entity are `{ __ref: "OtherTypename:id" }`
// instead of being inlined. We only need two entity shapes out of it —
// verified against a live fetch of https://globoplay.globo.com/canais/premiere/
// on 2026-08-27 (3 SoccerMatch / 6 SportsTeam entries in that snapshot).
export const apolloStateSchema = z.record(z.string(), z.unknown());
export type ApolloState = z.infer<typeof apolloStateSchema>;

export function parseApolloState(value: unknown): ApolloState {
  return apolloStateSchema.parse(value);
}

const teamRefSchema = z.object({ __ref: z.string() });

const soccerMatchSchema = z.object({
  __typename: z.literal("SoccerMatch"),
  // Unix seconds (not ms) — confirmed live: a value like 1788044400 only
  // lands on a real 2026 date when treated as seconds.
  startTime: z.number(),
  homeTeam: teamRefSchema,
  awayTeam: teamRefSchema,
});

const sportsTeamSchema = z.object({
  __typename: z.literal("SportsTeam"),
  name: z.string(),
});

/** Resolves a SportsTeam __ref against the same apolloState dict it came from; null if the entity is missing or doesn't match the expected shape (page structure changed, or a non-team ref). */
function resolveTeamName(apolloState: ApolloState, ref: string): string | null {
  const result = sportsTeamSchema.safeParse(apolloState[ref]);
  return result.success ? result.data.name : null;
}

export interface PremiereMatch {
  homeTeamNameRaw: string;
  awayTeamNameRaw: string;
  startTimeUtc: string;
}

/** Every SoccerMatch entity in the cache with both team refs resolvable — a raw entity failing soccerMatchSchema (or a team ref not resolving) is a normal skip, not an error: the same cache holds plenty of non-SoccerMatch, non-team entities (Broadcast, Offer, Video, ...) mixed in. */
export function extractPremiereMatches(apolloState: ApolloState): PremiereMatch[] {
  const results: PremiereMatch[] = [];

  for (const value of Object.values(apolloState)) {
    const parsed = soccerMatchSchema.safeParse(value);
    if (!parsed.success) continue;

    const homeTeamNameRaw = resolveTeamName(apolloState, parsed.data.homeTeam.__ref);
    const awayTeamNameRaw = resolveTeamName(apolloState, parsed.data.awayTeam.__ref);
    if (!homeTeamNameRaw || !awayTeamNameRaw) continue;

    results.push({
      homeTeamNameRaw,
      awayTeamNameRaw,
      startTimeUtc: new Date(parsed.data.startTime * 1000).toISOString(),
    });
  }

  return results;
}
