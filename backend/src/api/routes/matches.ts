import type { MatchView } from "@ondevaipassar/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getMatchViews } from "../../matches/getMatchViews.js";

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

    const result: MatchView[] = await getMatchViews(parsedQuery.data);
    return result;
  });
}
