import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
});

export const competitions = sqliteTable("competitions", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
});

export const matches = sqliteTable("matches", {
  // Deterministic id derived from the natural key (competition + both teams +
  // kickoff time) so re-ingesting the same fixture is a plain upsert-by-id,
  // no separate lookup step needed. See ingest/pipeline.ts's buildMatchId.
  id: text("id").primaryKey(),
  competitionId: text("competition_id").notNull(),
  homeTeamId: text("home_team_id"),
  homeTeamNameRaw: text("home_team_name_raw").notNull(),
  homeTeamCrestUrl: text("home_team_crest_url").notNull(),
  awayTeamId: text("away_team_id"),
  awayTeamNameRaw: text("away_team_name_raw").notNull(),
  awayTeamCrestUrl: text("away_team_crest_url").notNull(),
  kickoffUtc: text("kickoff_utc").notNull(),
  round: integer("round"),
  status: text("status").notNull(),
  sourceId: text("source_id").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const broadcasts = sqliteTable("broadcasts", {
  // Same trick: id = `${matchId}__${channelId}`, upsert-by-id instead of a
  // separate unique-pair lookup.
  id: text("id").primaryKey(),
  matchId: text("match_id").notNull(),
  channelId: text("channel_id").notNull(),
  logoUrl: text("logo_url").notNull(),
  sourceId: text("source_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const scrapeRuns = sqliteTable("scrape_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: text("source_id").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status").notNull(), // "ok" | "partial" | "failed"
  matchesFound: integer("matches_found").notNull().default(0),
  matchesUnresolved: integer("matches_unresolved").notNull().default(0),
  errorMessage: text("error_message"),
});

export const instagramPosts = sqliteTable("instagram_posts", {
  // Same id as the match's own id — one post per match, so no separate
  // lookup/uniqueness handling needed to guard against double-posting.
  id: text("id").primaryKey(),
  matchId: text("match_id").notNull(),
  status: text("status").notNull(), // "published" | "failed"
  igMediaId: text("ig_media_id"),
  postedAt: text("posted_at"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
});
