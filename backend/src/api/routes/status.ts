import { isTodayInBrasilia, startOfTodayInBrasiliaUtc } from "@ondevaipassar/shared";
import { desc } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { db } from "../../db/client.js";
import { instagramPosts, scrapeRuns } from "../../db/schema.js";
import { getMatchViews } from "../../matches/getMatchViews.js";

// Enough rows to always cover the last full run of every source (a run
// writes roughly one row per source), without reading a table that grows
// by that much every single day.
const RUN_HISTORY_LIMIT = 200;

const querySchema = z.object({
  /** Includes each failed run's own error message. Behind ADMIN_TOKEN: those messages are internal detail, and this route is otherwise public. */
  detail: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

interface SourceStatus {
  sourceId: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  matchesFound: number;
  matchesUnresolved: number;
  ranToday: boolean;
  errorMessage?: string;
}

/**
 * "Did today's ingest actually work?", answered from data we were already
 * writing and never reading.
 *
 * Every source has recorded its own outcome in scrape_runs since the start,
 * but nothing surfaced it, so a broken source was invisible until someone
 * noticed wrong data on the site. Both bugs found on 2026-09-06 were caught
 * that way — by Sérgio, reading a team page — and one of them (the ingest
 * timing out and dying before futnatv ran) is exactly what this makes
 * obvious at a glance.
 *
 * Public on purpose: it's operational metadata about public data, and being
 * able to just open it is most of its value. Error messages are the one
 * thing held back, since they're internal detail — `?detail=true` with
 * ADMIN_TOKEN includes them.
 */
export async function statusRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/status", async (request, reply) => {
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: "invalid query params", details: parsedQuery.error.flatten() });
    }

    const wantsDetail = parsedQuery.data.detail;
    if (wantsDetail && (!env.ADMIN_TOKEN || request.headers.authorization !== `Bearer ${env.ADMIN_TOKEN}`)) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    const now = new Date();
    const runs = await db.select().from(scrapeRuns).orderBy(desc(scrapeRuns.startedAt)).limit(RUN_HISTORY_LIMIT);

    // First row wins: the query is newest-first, so this keeps each source's
    // most recent run and drops its history.
    const latestBySource = new Map<string, SourceStatus>();
    for (const run of runs) {
      if (latestBySource.has(run.sourceId)) continue;
      latestBySource.set(run.sourceId, {
        sourceId: run.sourceId,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        matchesFound: run.matchesFound,
        matchesUnresolved: run.matchesUnresolved,
        ranToday: isTodayInBrasilia(run.startedAt, now),
        ...(wantsDetail && run.errorMessage ? { errorMessage: run.errorMessage } : {}),
      });
    }

    const sources = [...latestBySource.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
    // A source that didn't run at all today is the failure mode that hid
    // the timeout: it reports no error because it never got to start.
    const stale = sources.filter((source) => !source.ranToday).map((source) => source.sourceId);
    // Only "failed" — NOT "partial". Partial just means some team name in
    // that source didn't resolve, which is routine (6 of the sources report
    // it on a normal day). Warning on it would make this page cry wolf
    // every morning and teach whoever reads it to skip the warnings.
    const failing = sources.filter((source) => source.status === "failed").map((source) => source.sourceId);

    const todaysMatches = (await getMatchViews({ from: startOfTodayInBrasiliaUtc(now) })).filter((match) =>
      isTodayInBrasilia(match.kickoffUtc, now),
    );
    const withoutBroadcast = todaysMatches.filter((match) => match.broadcasts.length === 0);

    const postsToday = (await db.select().from(instagramPosts)).filter((post) =>
      todaysMatches.some((match) => match.id === post.matchId),
    );
    const countByStatus = (status: string): number => postsToday.filter((post) => post.status === status).length;

    return {
      checkedAt: now.toISOString(),
      // The one-line answer: anything here means something needs looking at.
      warnings: [
        ...stale.map((sourceId) => `${sourceId}: não rodou hoje`),
        ...failing.map((sourceId) => `${sourceId}: última execução falhou`),
      ],
      sources,
      today: {
        matches: todaysMatches.length,
        withoutBroadcast: withoutBroadcast.length,
        withoutBroadcastIds: withoutBroadcast.map((match) => match.id),
      },
      instagram: {
        published: countByStatus("published"),
        failed: countByStatus("failed"),
        // Never retried automatically — needs someone to look at the account
        // (see poster.ts's PostingSummary).
        unknown: countByStatus("unknown"),
        pending: todaysMatches.filter(
          (match) => match.broadcasts.length > 0 && !postsToday.some((post) => post.matchId === match.id),
        ).length,
      },
    };
  });
}
