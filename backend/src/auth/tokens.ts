import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 256 bits from the OS CSPRNG, URL-safe. Used for session tokens, OAuth state and nonce. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex. What a session token is stored as, so the database never holds a usable token. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Equality that doesn't leak how many leading characters matched. Both sides
 * are hashed first, which also makes the lengths equal — timingSafeEqual
 * throws on unequal lengths, and returning early on a length difference would
 * itself be a timing signal.
 */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}
