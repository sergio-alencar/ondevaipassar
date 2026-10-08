import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { clearCookie, parseCookies, serializeCookie } from "../../auth/cookies.js";
import { buildGoogleAuthUrl, exchangeCodeForIdToken, readIdTokenClaims, validateIdTokenClaims } from "../../auth/google.js";
import { isAllowedOrigin } from "../../auth/origin.js";
import { sanitizePreferences } from "../../auth/preferences.js";
import { createSession, deleteSession, getSessionUser, purgeExpiredSessions, SESSION_COOKIE, SESSION_TTL_SECONDS } from "../../auth/session.js";
import { newToken, safeEqual } from "../../auth/tokens.js";
import { deleteAccount, findOrCreateUser, getPreferences, savePreferences } from "../../auth/users.js";

const OAUTH_COOKIE = "ovp_oauth";
const OAUTH_COOKIE_SECONDS = 10 * 60;

export interface AuthRoutesOptions {
  /** Swappable so tests don't call Google. */
  exchangeCode?: typeof exchangeCodeForIdToken;
  now?: () => Date;
}

/**
 * Optional accounts. Every path is ONE segment after /api/ — the same Vercel
 * routing constraint /api/cron-ingest documents.
 *
 * Nothing here is needed to use the site: these exist so a visitor can keep
 * their favourite teams and channels across devices (see
 * packages/shared/src/preferences.ts for how the two sides are reconciled).
 */
export function authRoutes(options: AuthRoutesOptions = {}) {
  const exchangeCode = options.exchangeCode ?? exchangeCodeForIdToken;
  const now = options.now ?? (() => new Date());

  const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  // The dev login is a hole in authentication by design (anyone who can reach
  // it is anyone they say they are). Two independent conditions both have to
  // hold, and the route is simply not registered otherwise, so there is no
  // handler to misconfigure.
  const devLoginEnabled = env.AUTH_DEV_LOGIN && process.env.NODE_ENV !== "production";

  const secure = env.PUBLIC_SITE_URL.startsWith("https://");
  const redirectUri = `${env.PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`}/api/auth-google-callback`;

  const sessionCookie = (token: string) =>
    serializeCookie(SESSION_COOKIE, token, { maxAgeSeconds: SESSION_TTL_SECONDS, secure, domain: env.COOKIE_DOMAIN });
  const clearSessionCookie = () => clearCookie(SESSION_COOKIE, { secure, domain: env.COOKIE_DOMAIN });

  const noStore = (reply: FastifyReply) => reply.header("cache-control", "no-store");
  const redirect = (reply: FastifyReply, location: string) => reply.code(302).header("location", location).send();
  const siteUrl = (login: "ok" | "falhou") => `${env.PUBLIC_SITE_URL.replace(/\/$/, "")}/?login=${login}`;

  const sessionToken = (request: FastifyRequest) => parseCookies(request.headers.cookie)[SESSION_COOKIE];

  /** Resolves the session, or answers 401 itself and returns null. */
  async function requireUser(request: FastifyRequest, reply: FastifyReply) {
    noStore(reply);
    const user = await getSessionUser(sessionToken(request), now());
    if (!user) {
      void reply.code(401).send({ error: "not signed in" });
      return null;
    }
    return user;
  }

  /** CSRF guard for anything that changes state. Answers 403 itself and returns false. */
  function requireOwnOrigin(request: FastifyRequest, reply: FastifyReply): boolean {
    noStore(reply);
    if (isAllowedOrigin(request.headers.origin, env.CORS_ORIGIN)) return true;
    void reply.code(403).send({ error: "origin not allowed" });
    return false;
  }

  return async function register(app: FastifyInstance): Promise<void> {
    app.get("/api/me", async (request, reply) => {
      noStore(reply);
      const user = await getSessionUser(sessionToken(request), now());
      return {
        user: user ? { email: user.email } : null,
        // The site shows "Entrar com Google" only when this is true, so a
        // deployment without credentials never has a button that goes nowhere.
        loginAvailable: googleConfigured,
        devLogin: devLoginEnabled,
      };
    });

    app.get("/api/auth-google", async (_request, reply) => {
      noStore(reply);
      if (!googleConfigured) return reply.code(503).send({ error: "login unavailable" });

      const state = newToken();
      const nonce = newToken();
      // State and nonce travel in a short-lived cookie and are compared on the
      // way back: that is what proves the callback answers a sign-in THIS
      // browser started, rather than one an attacker started and is feeding to
      // a victim's browser. Lax so it is sent on Google's redirect back; scoped
      // to /api so it goes nowhere else.
      reply.header("set-cookie", serializeCookie(OAUTH_COOKIE, `${state}.${nonce}`, { maxAgeSeconds: OAUTH_COOKIE_SECONDS, path: "/api", secure }));
      return redirect(reply, buildGoogleAuthUrl({ clientId: env.GOOGLE_CLIENT_ID as string, redirectUri, state, nonce }));
    });

    const callbackQuery = z.object({ code: z.string().min(1).optional(), state: z.string().min(1).optional(), error: z.string().optional() });

    app.get("/api/auth-google-callback", async (request, reply) => {
      noStore(reply);
      // Whatever happens, the one-time cookie is spent.
      const spendOAuthCookie = clearCookie(OAUTH_COOKIE, { path: "/api", secure });
      const fail = (reason: string) => {
        request.log.warn({ reason }, "google sign-in refused");
        return reply.header("set-cookie", spendOAuthCookie).code(302).header("location", siteUrl("falhou")).send();
      };

      if (!googleConfigured) return fail("not configured");
      const query = callbackQuery.safeParse(request.query);
      if (!query.success || query.data.error || !query.data.code || !query.data.state) return fail("denied or malformed callback");

      const [expectedState, expectedNonce] = (parseCookies(request.headers.cookie)[OAUTH_COOKIE] ?? "").split(".");
      if (!expectedState || !expectedNonce || !safeEqual(query.data.state, expectedState)) return fail("state mismatch");

      let idToken: string;
      try {
        idToken = await exchangeCode({
          code: query.data.code,
          clientId: env.GOOGLE_CLIENT_ID as string,
          clientSecret: env.GOOGLE_CLIENT_SECRET as string,
          redirectUri,
        });
      } catch (error) {
        // The message can carry Google's response; never the code or secret.
        return fail(`token exchange failed: ${error instanceof Error ? error.message : "unknown"}`);
      }

      const verdict = validateIdTokenClaims(readIdTokenClaims(idToken), {
        clientId: env.GOOGLE_CLIENT_ID as string,
        nonce: expectedNonce,
        nowSeconds: Math.floor(now().getTime() / 1000),
      });
      if (!verdict.ok) return fail(`id token rejected: ${verdict.reason}`);

      const user = await findOrCreateUser("google", verdict.subject, verdict.email, now());
      await purgeExpiredSessions(now());
      const token = await createSession(user.id, now());
      return reply.header("set-cookie", [sessionCookie(token), spendOAuthCookie]).code(302).header("location", siteUrl("ok")).send();
    });

    if (devLoginEnabled) {
      app.log.warn("AUTH_DEV_LOGIN is on: /api/auth-dev signs anyone in without Google. Local development only.");
      app.get("/api/auth-dev", async (request, reply) => {
        noStore(reply);
        const { email } = z.object({ email: z.string().email().default("dev@example.com") }).parse(request.query);
        const user = await findOrCreateUser("dev", email, email, now());
        const token = await createSession(user.id, now());
        return reply.header("set-cookie", sessionCookie(token)).code(302).header("location", siteUrl("ok")).send();
      });
    }

    app.get("/api/preferences", async (request, reply) => {
      const user = await requireUser(request, reply);
      if (!user) return reply;
      return getPreferences(user.id);
    });

    app.put("/api/preferences", async (request, reply) => {
      if (!requireOwnOrigin(request, reply)) return reply;
      const user = await requireUser(request, reply);
      if (!user) return reply;
      const clean = sanitizePreferences(request.body, (await getPreferences(user.id)).competitions);
      if (!clean) return reply.code(400).send({ error: "invalid body" });
      return savePreferences(user.id, clean, now());
    });

    app.post("/api/logout", async (request, reply) => {
      if (!requireOwnOrigin(request, reply)) return reply;
      await deleteSession(sessionToken(request));
      return reply.header("set-cookie", clearSessionCookie()).send({ ok: true });
    });

    app.delete("/api/account", async (request, reply) => {
      if (!requireOwnOrigin(request, reply)) return reply;
      const user = await requireUser(request, reply);
      if (!user) return reply;
      await deleteAccount(user.id);
      return reply.header("set-cookie", clearSessionCookie()).send({ ok: true });
    });
  };
}
