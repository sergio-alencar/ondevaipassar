import { findChannelById, findCompetitionById, findTeamById, type MatchView } from "@ondevaipassar/shared";
import { and, eq, gte, inArray, lte, or, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { broadcasts, matches } from "../db/schema.js";

export interface GetMatchViewsQuery {
  id?: string;
  teamId?: string;
  competitionId?: string;
  from?: string;
  to?: string;
}

export async function getMatchViews(query: GetMatchViewsQuery): Promise<MatchView[]> {
  // A lookup by id wants exactly that match, regardless of the "upcoming
  // only" floor below (e.g. the Instagram preview route resolving a match
  // that's already kicking off) — no other filter makes sense combined with it.
  if (query.id) {
    return buildMatchViews([eq(matches.id, query.id)]);
  }

  const { teamId, competitionId, to } = query;
  // Ge.globo never marks a played match as finished in our data (see
  // ge-globo/adapter.ts) and the pipeline only upserts, never prunes — so
  // without a floor here, a match from last week outranks a real upcoming
  // one in the ascending sort every page relies on to show "next match".
  // An explicit `from` (e.g. an admin/history view) still overrides this.
  const from = query.from ?? new Date().toISOString();

  const conditions: (SQL | undefined)[] = [gte(matches.kickoffUtc, from)];
  if (teamId) conditions.push(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)));
  if (competitionId) conditions.push(eq(matches.competitionId, competitionId));
  if (to) conditions.push(lte(matches.kickoffUtc, to));

  return buildMatchViews(conditions);
}

async function buildMatchViews(conditions: (SQL | undefined)[]): Promise<MatchView[]> {

  const matchRows = await db
    .select()
    .from(matches)
    .where(and(...conditions.filter((condition): condition is SQL => condition !== undefined)));

  const matchIds = matchRows.map((row) => row.id);
  const broadcastRows = matchIds.length > 0 ? await db.select().from(broadcasts).where(inArray(broadcasts.matchId, matchIds)) : [];

  const broadcastsByMatchId = new Map<string, typeof broadcastRows>();
  for (const broadcast of broadcastRows) {
    const list = broadcastsByMatchId.get(broadcast.matchId) ?? [];
    list.push(broadcast);
    broadcastsByMatchId.set(broadcast.matchId, list);
  }

  return matchRows
    .map((row) => {
      const homeTeam = row.homeTeamId ? findTeamById(row.homeTeamId) : undefined;
      const awayTeam = row.awayTeamId ? findTeamById(row.awayTeamId) : undefined;
      const competition = findCompetitionById(row.competitionId);

      const matchBroadcasts = (broadcastsByMatchId.get(row.id) ?? [])
        .flatMap((broadcast) => {
          const channel = findChannelById(broadcast.channelId);
          if (!channel) return [];
          return [
            {
              channelId: channel.id,
              displayName: channel.displayName,
              url: channel.officialUrl,
              alternateUrl: channel.alternateUrl,
              logoUrl: broadcast.logoUrl,
              regionalCaveat: channel.regionalCaveat ?? false,
            },
          ];
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"));

      return {
        id: row.id,
        competitionId: row.competitionId,
        competitionName: competition?.displayName ?? row.competitionId,
        homeTeamId: row.homeTeamId,
        homeTeamName: homeTeam?.displayName ?? row.homeTeamNameRaw,
        homeTeamCrestUrl: row.homeTeamCrestUrl,
        awayTeamId: row.awayTeamId,
        awayTeamName: awayTeam?.displayName ?? row.awayTeamNameRaw,
        awayTeamCrestUrl: row.awayTeamCrestUrl,
        kickoffUtc: row.kickoffUtc,
        kickoffTimeConfirmed: row.kickoffTimeConfirmed,
        round: row.round,
        status: row.status as MatchView["status"],
        broadcasts: matchBroadcasts,
      };
    })
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
}
