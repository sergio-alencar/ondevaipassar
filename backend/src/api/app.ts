import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "../config/env.js";
import { competitionsRoutes } from "./routes/competitions.js";
import { healthRoutes } from "./routes/health.js";
import { matchesRoutes } from "./routes/matches.js";
import { teamsRoutes } from "./routes/teams.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.CORS_ORIGIN });
  await app.register(healthRoutes);
  await app.register(matchesRoutes);
  await app.register(teamsRoutes);
  await app.register(competitionsRoutes);

  return app;
}
