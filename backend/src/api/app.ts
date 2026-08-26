import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "../config/env.js";
import { ensureSchema } from "../db/client.js";
import { seedRegistry } from "../ingest/pipeline.js";
import { competitionsRoutes } from "./routes/competitions.js";
import { cronRoutes } from "./routes/cron.js";
import { healthRoutes } from "./routes/health.js";
import { instagramCronRoutes } from "./routes/instagramCron.js";
import { instagramPreviewRoutes } from "./routes/instagramPreview.js";
import { matchesRoutes } from "./routes/matches.js";
import { teamsRoutes } from "./routes/teams.js";

export async function buildApp() {
  // No persistent "boot" moment in serverless — every cold start does this.
  // Both are cheap/idempotent (DDL is IF NOT EXISTS, registry is an upsert).
  await ensureSchema();
  await seedRegistry();

  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.CORS_ORIGIN });
  await app.register(healthRoutes);
  await app.register(matchesRoutes);
  await app.register(teamsRoutes);
  await app.register(competitionsRoutes);
  await app.register(cronRoutes);
  await app.register(instagramCronRoutes);
  await app.register(instagramPreviewRoutes);

  return app;
}
