import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "../config/env.js";
import { ensureSchema } from "../db/client.js";
import { seedRegistry } from "../ingest/pipeline.js";
import { competitionsRoutes } from "./routes/competitions.js";
import { crestProxyRoutes } from "./routes/crestProxy.js";
import { digestRoutes } from "./routes/digest.js";
import { statusRoutes } from "./routes/status.js";
import { adminBroadcastRoutes } from "./routes/adminBroadcast.js";
import { authRoutes } from "./routes/auth.js";
import { cronRoutes } from "./routes/cron.js";
import { healthRoutes } from "./routes/health.js";
import { instagramCronRoutes } from "./routes/instagramCron.js";
import { instagramPreviewRoutes } from "./routes/instagramPreview.js";
import { instagramSlideRoutes } from "./routes/instagramSlide.js";
import { matchesRoutes } from "./routes/matches.js";
import { teamsRoutes } from "./routes/teams.js";

export async function buildApp() {
  // No persistent "boot" moment in serverless — every cold start does this.
  // Both are cheap/idempotent (DDL is IF NOT EXISTS, registry is an upsert).
  await ensureSchema();
  await seedRegistry();

  const app = Fastify({ logger: true });

  // credentials: true so the browser may send the session cookie on the
  // site's own API calls. Safe because `origin` is an explicit allowlist and
  // never "*" — with a wildcard the browser refuses credentials, and echoing
  // any origin back would hand them to every site. PUT and DELETE are listed
  // because @fastify/cors only allows GET, HEAD and POST by default.
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true, methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"] });
  await app.register(healthRoutes);
  await app.register(matchesRoutes);
  await app.register(teamsRoutes);
  await app.register(competitionsRoutes);
  await app.register(cronRoutes);
  await app.register(instagramCronRoutes);
  await app.register(instagramPreviewRoutes);
  await app.register(instagramSlideRoutes);
  await app.register(crestProxyRoutes);
  await app.register(digestRoutes);
  await app.register(statusRoutes);
  await app.register(adminBroadcastRoutes);
  await app.register(authRoutes());

  return app;
}
