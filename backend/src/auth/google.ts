import { safeEqual } from "./tokens.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Where the browser is sent to sign in. Only "openid email" is requested: all
 * the site wants to know is which account this is and an address to show back
 * ("conectado como ..."). No profile, no photo, no contacts.
 *
 * `prompt=select_account` so a browser signed into several Google accounts
 * asks which one, instead of silently picking the first.
 */
export function buildGoogleAuthUrl(params: { clientId: string; redirectUri: string; state: string; nonce: string }): string {
  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: "openid email",
    state: params.state,
    nonce: params.nonce,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${query.toString()}`;
}

/** Trades the one-time code for an ID token, server to server (the client secret never reaches the browser). */
export async function exchangeCodeForIdToken(
  config: GoogleOAuthConfig & { code: string },
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: config.code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Google token endpoint answered HTTP ${response.status}`);
  const body = (await response.json()) as { id_token?: unknown };
  if (typeof body.id_token !== "string" || body.id_token.length === 0) throw new Error("Google response had no id_token");
  return body.id_token;
}

export interface IdTokenClaims {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  exp?: unknown;
  nonce?: unknown;
  email?: unknown;
  email_verified?: unknown;
}

/** The payload of a JWT, or null if it isn't one. NOT a signature check — see validateIdTokenClaims. */
export function readIdTokenClaims(idToken: string): IdTokenClaims | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    return typeof payload === "object" && payload !== null ? (payload as IdTokenClaims) : null;
  } catch {
    return null;
  }
}

export type ClaimsResult = { ok: true; subject: string; email: string } | { ok: false; reason: string };

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/**
 * Checks everything OpenID Connect asks of an ID token's claims: issuer,
 * audience (it was issued to THIS client), expiry, and the nonce that ties it
 * to the sign-in this browser started.
 *
 * The JWT's signature is deliberately not verified. Per OpenID Connect Core
 * 3.1.3.7 step 6, a token received directly from the token endpoint over TLS —
 * as this one is, in exchange for a code only we hold and authenticated with
 * the client secret — may rely on that TLS channel in place of the signature.
 * It would be required for a token handed to us by the browser, which this
 * never accepts.
 *
 * An unverified e-mail is refused: the address is only ever displayed, but an
 * identity provider's claim about an address it hasn't confirmed isn't worth
 * keeping.
 */
export function validateIdTokenClaims(
  claims: IdTokenClaims | null,
  expected: { clientId: string; nonce: string; nowSeconds: number },
): ClaimsResult {
  if (!claims) return { ok: false, reason: "malformed token" };
  if (typeof claims.iss !== "string" || !GOOGLE_ISSUERS.includes(claims.iss)) return { ok: false, reason: "wrong issuer" };
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(expected.clientId)) return { ok: false, reason: "wrong audience" };
  if (typeof claims.exp !== "number" || claims.exp <= expected.nowSeconds) return { ok: false, reason: "expired" };
  if (typeof claims.nonce !== "string" || !safeEqual(claims.nonce, expected.nonce)) return { ok: false, reason: "wrong nonce" };
  if (typeof claims.sub !== "string" || claims.sub.length === 0) return { ok: false, reason: "no subject" };
  if (typeof claims.email !== "string" || claims.email.length === 0) return { ok: false, reason: "no email" };
  if (claims.email_verified !== true) return { ok: false, reason: "email not verified" };
  return { ok: true, subject: claims.sub, email: claims.email };
}
