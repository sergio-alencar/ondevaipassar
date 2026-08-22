import cron from "node-cron";
import { runAdapter } from "../ingest/pipeline.js";
import { ACTIVE_ADAPTERS } from "../sources/registry.js";

// Every 3 hours: broadcast assignments don't change minute to minute, and
// scraped sources should be hit conservatively. Revisit per-source cadence
// once a low-latency official API (e.g. football-data.org) is added.
const SCHEDULE = "0 */3 * * *";

export function startScheduler(): void {
  cron.schedule(SCHEDULE, () => {
    for (const adapter of ACTIVE_ADAPTERS) {
      void runAdapter(adapter);
    }
  });
}
