import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Preferences } from "@ondevaipassar/shared";
import { db } from "../db/client.js";
import { sessions, userPreferences, users } from "../db/schema.js";

/** The account for a provider identity, created on first sign-in. The e-mail is refreshed each time, since the provider is the source of truth for it. */
export async function findOrCreateUser(provider: string, providerId: string, email: string, now: Date = new Date()) {
  // Insert-then-select, not select-then-insert: two simultaneous first
  // sign-ins would both see "no user" and the second insert would fail on the
  // (provider, provider_id) uniqueness.
  await db
    .insert(users)
    .values({ id: randomUUID(), provider, providerId, email, createdAt: now.toISOString() })
    .onConflictDoNothing({ target: [users.provider, users.providerId] });
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(eq(users.provider, provider), eq(users.providerId, providerId)))
    .limit(1);
  if (user.email !== email) {
    await db.update(users).set({ email }).where(eq(users.id, user.id));
  }
  return { id: user.id, email };
}

export interface StoredPreferences extends Preferences {
  /** Null until the account has saved something. */
  updatedAt: string | null;
}

export async function getPreferences(userId: string): Promise<StoredPreferences> {
  const [row] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  if (!row) return { teams: [], channels: [], updatedAt: null };
  return { teams: JSON.parse(row.teamsJson) as string[], channels: JSON.parse(row.channelsJson) as string[], updatedAt: row.updatedAt };
}

export async function savePreferences(userId: string, preferences: Preferences, now: Date = new Date()): Promise<StoredPreferences> {
  const updatedAt = now.toISOString();
  const values = { teamsJson: JSON.stringify(preferences.teams), channelsJson: JSON.stringify(preferences.channels), updatedAt };
  await db
    .insert(userPreferences)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userPreferences.userId, set: values });
  return { ...preferences, updatedAt };
}

/** Removes the account and everything tied to it, in one atomic batch: sessions, preferences, the user row. */
export async function deleteAccount(userId: string): Promise<void> {
  await db.batch([
    db.delete(sessions).where(eq(sessions.userId, userId)),
    db.delete(userPreferences).where(eq(userPreferences.userId, userId)),
    db.delete(users).where(eq(users.id, userId)),
  ]);
}
