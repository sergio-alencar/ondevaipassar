import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { sessions, users } from "../db/schema.js";
import { hashToken, newToken } from "./tokens.js";

export const SESSION_COOKIE = "ovp_session";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface SessionUser {
  id: string;
  email: string;
}

/** Starts a session and returns the token for the cookie. Only its hash is stored. */
export async function createSession(userId: string, now: Date = new Date()): Promise<string> {
  const token = newToken();
  await db.insert(sessions).values({
    idHash: hashToken(token),
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString(),
  });
  return token;
}

/** The user behind a session token, or null for an unknown, expired or malformed one. */
export async function getSessionUser(token: string | undefined, now: Date = new Date()): Promise<SessionUser | null> {
  if (!token) return null;
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.idHash, hashToken(token)), gt(sessions.expiresAt, now.toISOString())))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.idHash, hashToken(token)));
}

/** Housekeeping on each sign-in: expired sessions are useless and there's no scheduler for this. */
export async function purgeExpiredSessions(now: Date = new Date()): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now.toISOString()));
}
