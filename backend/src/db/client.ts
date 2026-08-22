import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });

const sqlite = new Database(env.DATABASE_PATH);
sqlite.pragma("journal_mode = WAL");

sqlite.exec(`
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
    away_team_id TEXT,
    away_team_name_raw TEXT NOT NULL,
    kickoff_utc TEXT NOT NULL,
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
`);

export const db = drizzle(sqlite, { schema });
