import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

// file:./path URLs need the parent directory to exist first; a remote
// libsql:// or https:// URL (real Turso) doesn't touch the local filesystem
// at all — same client code either way, only the URL differs per environment.
if (env.DATABASE_URL.startsWith("file:")) {
  mkdirSync(dirname(env.DATABASE_URL.slice("file:".length)), { recursive: true });
}

const client = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});

let ready: Promise<unknown> | null = null;

// SQLite has no `ADD COLUMN IF NOT EXISTS` — the CREATE TABLE above only
// covers a fresh database. A table that already existed before this column
// was added (i.e. production, with real rows) needs this instead; it fails
// with "duplicate column name" once the column is there, which is exactly
// the steady state after the first cold start post-deploy, so that specific
// error is swallowed. No migration tool exists in this project (see
// ensureSchema's own doc comment) — this is the same "detect and skip"
// spirit applied to a column instead of a table.
async function addColumnIfMissing(table: string, columnDdl: string): Promise<void> {
  try {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${columnDdl}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("duplicate column name")) throw error;
  }
}

/** Idempotent DDL, safe to call on every cold start (serverless has no persistent "boot" moment to run this once). */
export function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = client
      .executeMultiple(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS competitions (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        competition_id TEXT NOT NULL,
        home_team_id TEXT,
        home_team_name_raw TEXT NOT NULL,
        home_team_crest_url TEXT NOT NULL,
        away_team_id TEXT,
        away_team_name_raw TEXT NOT NULL,
        away_team_crest_url TEXT NOT NULL,
        kickoff_utc TEXT NOT NULL,
        kickoff_time_confirmed INTEGER NOT NULL DEFAULT 1,
        round INTEGER,
        status TEXT NOT NULL,
        source_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS matches_kickoff_idx ON matches (kickoff_utc);
      CREATE INDEX IF NOT EXISTS matches_teams_idx ON matches (home_team_id, away_team_id);

      CREATE TABLE IF NOT EXISTS broadcasts (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        logo_url TEXT NOT NULL,
        watch_url TEXT,
        source_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS broadcasts_match_idx ON broadcasts (match_id);

      CREATE TABLE IF NOT EXISTS scrape_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        status TEXT NOT NULL,
        matches_found INTEGER NOT NULL DEFAULT 0,
        matches_unresolved INTEGER NOT NULL DEFAULT 0,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS instagram_posts (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        status TEXT NOT NULL,
        ig_media_id TEXT,
        posted_at TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL
      );
    `)
      .then(() => addColumnIfMissing("matches", "kickoff_time_confirmed INTEGER NOT NULL DEFAULT 1"))
      .then(() => addColumnIfMissing("broadcasts", "watch_url TEXT"));
  }
  return ready;
}

export const db = drizzle(client, { schema });
