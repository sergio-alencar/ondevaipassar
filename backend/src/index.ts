// Local dev entry point only — a long-lived process with app.listen().
// Production runs through api/[...slug].ts as a Vercel serverless function
// instead; scheduling there is Vercel Cron hitting /api/cron/ingest
// (see vercel.json), not anything in this file.
import { buildApp } from "./api/app.js";
import { env } from "./config/env.js";
import { runAdapter } from "./ingest/pipeline.js";
import { ACTIVE_ADAPTERS } from "./sources/registry.js";

async function main(): Promise<void> {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });

  // Convenience for local dev only: don't wait for a manual curl of
  // /api/cron/ingest to see real data.
  for (const adapter of ACTIVE_ADAPTERS) {
    void runAdapter(adapter);
  }
}

main().catch((error) => {
  console.error("Fatal error during startup:", error);
  process.exit(1);
});
