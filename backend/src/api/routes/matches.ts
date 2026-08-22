import { findChannelById, findCompetitionById, findTeamById, type MatchView } from "@ondevaipassar/shared";
import { and, eq, gte, inArray, lte, or, type SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../db/client.js";
import { broadcasts, matches } from "../../db/schema.js";

const querySchema = z.object({
  teamId: z.string().optional(),
  competitionId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function matchesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/matches", async (request, reply) => {
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: "invalid query params", details: parsedQuery.error.flatten() });
    }
    const { teamId, competitionId, to } = parsedQuery.data;
    // Ge.globo never marks a played match as finished in our data (see
    // ge-globo/adapter.ts) and the pipeline only upserts, never prunes — so
    // without a floor here, a match from last week outranks a real upcoming
    // one in the ascending sort every page relies on to show "next match".
    // An explicit `from` (e.g. an admin/history view) still overrides this.
    const from = parsedQuery.data.from ?? new Date().toISOString();

    const conditions: (SQL | undefined)[] = [gte(matches.kickoffUtc, from)];
    if (teamId) conditions.push(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)));
    if (competitionId) conditions.push(eq(matches.competitionId, competitionId));
    if (to) conditions.push(lte(matches.kickoffUtc, to));

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

    const result: MatchView[] = matchRows
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
          round: row.round,
          status: row.status as MatchView["status"],
          broadcasts: matchBroadcasts,
        };
      })
      .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));

    return result;
  });
}
