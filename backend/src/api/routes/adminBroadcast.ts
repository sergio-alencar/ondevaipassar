import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { db } from "../../db/client.js";
import { broadcasts } from "../../db/schema.js";

const listQuerySchema = z.object({ matchId: z.string().min(1) });
const removeQuerySchema = z.object({ id: z.string().min(1) });

/**
 * Removing one wrong broadcast row by hand.
 *
 * Needed twice in two days — a ge tv pre-game show attached as the match's
 * broadcast, and a women's fixture attached to the men's one — and both
 * times the only lever was waiting for the next ingest. That doesn't work
 * when the row is for a match kicking off within hours: the stale-broadcast
 * cleanup deliberately protects that window (see attachBroadcasts.ts), so
 * near kickoff, wrong data has no way out.
 *
 * Deletion only, never insertion: a wrong row can always be removed safely
 * because the sources rebuild what's real on the next run, while writing a
 * broadcast by hand would invent data no source is claiming — exactly what
 * this project refuses to do.
 *
 * Two different tokens on purpose, split by what the call can break rather
 * than by which file it lives in:
 *
 * - Reading uses ADMIN_TOKEN, kept as an ordinary readable env var. Its
 *   worst case is exposing a source's internal error text, and making
 *   diagnosis cost a token rotation plus a production deploy is what left
 *   wrong data sitting on the site because fixing it was too expensive.
 * - Deleting uses CRON_SECRET, which stays unreadable ("Sensitive"). Same
 *   token that already guards the other write operations — the ingest, the
 *   posting, and cron-instagram-reset, which also deletes. Writes are rare,
 *   so paying a rotation for them is fine.
 */
export async function adminBroadcastRoutes(app: FastifyInstance): Promise<void> {
  const authorizeRead = (request: { headers: { authorization?: string } }): boolean =>
    Boolean(env.ADMIN_TOKEN) && request.headers.authorization === `Bearer ${env.ADMIN_TOKEN}`;
  const authorizeWrite = (request: { headers: { authorization?: string } }): boolean =>
    Boolean(env.CRON_SECRET) && request.headers.authorization === `Bearer ${env.CRON_SECRET}`;

  // Read first: the id is `${matchId}__${channelId}`, and this saves
  // guessing it (or deleting the wrong one) from the outside.
  app.get("/api/admin-broadcasts", async (request, reply) => {
    if (!authorizeRead(request)) return reply.status(401).send({ error: "unauthorized" });

    const parsedQuery = listQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: "invalid query params", details: parsedQuery.error.flatten() });
    }

    const rows = await db.select().from(broadcasts).where(eq(broadcasts.matchId, parsedQuery.data.matchId));
    return { matchId: parsedQuery.data.matchId, broadcasts: rows };
  });

  app.get("/api/admin-broadcast-remove", async (request, reply) => {
    if (!authorizeWrite(request)) return reply.status(401).send({ error: "unauthorized" });

    const parsedQuery = removeQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: "invalid query params", details: parsedQuery.error.flatten() });
    }

    const [existing] = await db.select().from(broadcasts).where(eq(broadcasts.id, parsedQuery.data.id));
    if (!existing) return reply.status(404).send({ error: "broadcast not found" });

    await db.delete(broadcasts).where(eq(broadcasts.id, parsedQuery.data.id));
    // Echoing the removed row back is the only record of what was deleted —
    // there's no undo, and the next ingest may well put it straight back if
    // the source still claims it.
    return { status: "ok", removed: existing };
  });
}
