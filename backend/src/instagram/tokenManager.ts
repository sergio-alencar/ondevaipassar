import { eq } from "drizzle-orm";
import { db, ensureSchema } from "../db/client.js";
import { systemConfig } from "../db/schema.js";
import { env } from "../config/env.js";

const GRAPH_API_BASE = "https://graph.instagram.com/v25.0";
const TOKEN_KEY = "instagram_access_token";
const EXPIRES_KEY = "instagram_token_expires_at";

/** Days before expiry at which we proactively refresh. */
const REFRESH_THRESHOLD_DAYS = 15;

/** Returns the active Instagram access token: DB value takes precedence over the env var (so a refreshed token survives without a redeploy). */
export async function getInstagramToken(): Promise<string | undefined> {
  await ensureSchema();
  const row = await db.select().from(systemConfig).where(eq(systemConfig.key, TOKEN_KEY)).get();
  return row?.value ?? env.INSTAGRAM_ACCESS_TOKEN;
}

/** Persists a new token and its expiry to the database. */
async function saveToken(token: string, expiresInSeconds: number): Promise<void> {
  await ensureSchema();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  await db.batch([
    db
      .insert(systemConfig)
      .values({ key: TOKEN_KEY, value: token, updatedAt: now })
      .onConflictDoUpdate({ target: systemConfig.key, set: { value: token, updatedAt: now } }),
    db
      .insert(systemConfig)
      .values({ key: EXPIRES_KEY, value: expiresAt, updatedAt: now })
      .onConflictDoUpdate({ target: systemConfig.key, set: { value: expiresAt, updatedAt: now } }),
  ]);
}

/**
 * Refreshes the long-lived token if it expires within REFRESH_THRESHOLD_DAYS.
 * Safe to call on every ingest run — skips immediately when nothing needs doing.
 * Returns whether a refresh actually happened.
 */
export async function maybeRefreshInstagramToken(): Promise<{ refreshed: boolean; expiresAt?: string; error?: string }> {
  await ensureSchema();

  const expiresRow = await db.select().from(systemConfig).where(eq(systemConfig.key, EXPIRES_KEY)).get();
  if (expiresRow) {
    const daysLeft = (new Date(expiresRow.value).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft > REFRESH_THRESHOLD_DAYS) {
      console.log(`[instagram-token] ${Math.round(daysLeft)} days left — no refresh needed`);
      return { refreshed: false, expiresAt: expiresRow.value };
    }
    console.log(`[instagram-token] ${Math.round(daysLeft)} days left — refreshing`);
  } else {
    console.log("[instagram-token] no expiry recorded — refreshing now to establish baseline");
  }

  const token = await getInstagramToken();
  if (!token) {
    console.warn("[instagram-token] no token configured, skipping refresh");
    return { refreshed: false };
  }

  try {
    const url = `${GRAPH_API_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
    const res = await fetch(url);
    const body = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message: string } };
    if (!res.ok || !body.access_token) {
      const msg = body.error?.message ?? JSON.stringify(body);
      console.error("[instagram-token] refresh failed:", msg);
      return { refreshed: false, error: msg };
    }
    await saveToken(body.access_token, body.expires_in ?? 60 * 24 * 60 * 60);
    const expiresAt = new Date(Date.now() + (body.expires_in ?? 60 * 24 * 60 * 60) * 1000).toISOString();
    console.log(`[instagram-token] refreshed OK, new expiry: ${expiresAt}`);
    return { refreshed: true, expiresAt };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[instagram-token] refresh threw:", msg);
    return { refreshed: false, error: msg };
  }
}

/**
 * Stores a brand-new token (from a manual rotation or first setup) and records
 * its expiry. Call this after updating INSTAGRAM_ACCESS_TOKEN in Vercel so the
 * DB baseline is established and the auto-refresh can take over from there.
 * `expiresInSeconds` defaults to 60 days.
 */
export async function bootstrapInstagramToken(token: string, expiresInSeconds = 60 * 24 * 60 * 60): Promise<void> {
  await saveToken(token, expiresInSeconds);
  console.log("[instagram-token] bootstrapped new token in DB");
}
