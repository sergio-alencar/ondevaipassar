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
  // False = only the match's date is known (round scheduled, broadcaster
  // hasn't confirmed an exact kickoff time yet) — kickoffUtc is then a
  // midnight-BRT placeholder, not a real time. See ge-globo/adapter.ts.
  kickoffTimeConfirmed: integer("kickoff_time_confirmed", { mode: "boolean" }).notNull(),
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
  // A per-match direct link (e.g. a specific YouTube stream's own video url)
  // — null for the common case of a source with no such thing (a live TV
  // channel, or a broadcaster's own generic schedule page), which falls
  // back to the channel's officialUrl at render time (see getMatchViews.ts).
  watchUrl: text("watch_url"),
  // Normalized, always-alphabetical UF inclusion list for a broadcast that
  // varies by state (confirmed live so far only for "globo": futnatv.net
  // gives this as either a direct list, "Globo (RJ, AC, AL, ...)", or an
  // exclusion list, "Globo (menos SP, CE, MS e PR)" — both get turned into
  // the same "always inclusion, always A-Z" shape by
  // futnatv/broadcastText.ts's normalizeUfList, diffing an exclusion list
  // against the full 27-UF reference there) — null for the common case of
  // no source having this detail, which falls back to the generic
  // regionalCaveat disclaimer at render time (see getMatchViews.ts /
  // MatchBroadcasts.tsx).
  regionalDetail: text("regional_detail"),
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
  // "published" | "failed" | "unknown". "unknown" means the error happened
  // at or after the publish call, so we genuinely can't tell whether the
  // post went live — never retried automatically, because retrying is what
  // turned one ambiguous failure into dozens of duplicate posts (see
  // poster.ts's own comment on AMBIGUOUS_PHASES).
  status: text("status").notNull(),
  igMediaId: text("ig_media_id"),
  postedAt: text("posted_at"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
});
