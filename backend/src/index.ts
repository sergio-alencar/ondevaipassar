import { buildApp } from "./api/app.js";
import { env } from "./config/env.js";
import { seedRegistry, runAdapter } from "./ingest/pipeline.js";
import { startScheduler } from "./scheduler/jobs.js";
import { ACTIVE_ADAPTERS } from "./sources/registry.js";

async function main(): Promise<void> {
  seedRegistry();

  const app = await buildApp();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });

  // Don't make the first API caller wait for the cron schedule to tick.
  for (const adapter of ACTIVE_ADAPTERS) {
    void runAdapter(adapter);
  }

  startScheduler();
}

main().catch((error) => {
  console.error("Fatal error during startup:", error);
  process.exit(1);
});
