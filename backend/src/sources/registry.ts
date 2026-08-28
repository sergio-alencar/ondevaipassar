import type { FixtureSourceAdapter } from "./types.js";
import { geGloboAdapter } from "./ge-globo/adapter.js";
import { geGloboRoundAdapter } from "./ge-globo-round/adapter.js";

// Adding a source = implement FixtureSourceAdapter in its own folder, list it
// here. Nothing else (API routes, scheduler, ingest pipeline) needs to change.
//
// Order matters: geGloboRoundAdapter (coarser — current round only, no
// per-team dependency) runs before geGloboAdapter (richer — full future
// schedule, but only for matches at least one team's own page covers) so
// that for any match both find, the richer per-team data wins the
// conflicting field updates (see ge-globo-round/adapter.ts's own comment).
export const ACTIVE_ADAPTERS: FixtureSourceAdapter[] = [geGloboRoundAdapter, geGloboAdapter];
