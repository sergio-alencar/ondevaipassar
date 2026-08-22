import type { FixtureSourceAdapter } from "./types.js";
import { geGloboAdapter } from "./ge-globo/adapter.js";

// Adding a source = implement FixtureSourceAdapter in its own folder, list it
// here. Nothing else (API routes, scheduler, ingest pipeline) needs to change.
export const ACTIVE_ADAPTERS: FixtureSourceAdapter[] = [geGloboAdapter];
