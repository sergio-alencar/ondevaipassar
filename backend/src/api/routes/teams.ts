import { TEAMS } from "@ondevaipassar/shared";
import type { FastifyInstance } from "fastify";

export async function teamsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/teams", async () =>
    TEAMS.map((team) => ({
      id: team.id,
      displayName: team.displayName,
      color: team.color,
      crestFile: team.crestFile,
    })),
  );
}
