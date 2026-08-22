import { COMPETITIONS } from "@ondevaipassar/shared";
import type { FastifyInstance } from "fastify";

export async function competitionsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/competitions", async () => COMPETITIONS);
}
