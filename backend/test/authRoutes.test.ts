import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "http://localhost:5173";
const CLIENT_ID = "client-id.apps.googleusercontent.com";

interface Harness {
  app: FastifyInstance;
  setNow: (date: Date) => void;
  exchangeCalls: { code: string; clientSecret: string }[];
  /** What the fake Google token endpoint will return as the id_token. */
  setIdToken: (claims: Record<string, unknown> | Error) => void;
  db: typeof import("../src/db/client.js").db;
  schema: typeof import("../src/db/schema.js");
}

const dirs: string[] = [];

/**
 * A real Fastify app with the real auth routes over a real (temporary) SQLite
 * database — only Google's token endpoint is faked. env is read once at
 * import, so every harness resets modules and stubs the environment first.
 */
async function buildHarness(envOverrides: Record<string, string> = {}): Promise<Harness> {
  const dir = mkdtempSync(join(tmpdir(), "ovp-auth-"));
  dirs.push(dir);
  const environment: Record<string, string> = {
    DATABASE_URL: `file:${dir}/test.db`,
    GOOGLE_CLIENT_ID: CLIENT_ID,
    GOOGLE_CLIENT_SECRET: "the-client-secret",
    PUBLIC_SITE_URL: ORIGIN,
    PUBLIC_BASE_URL: "http://localhost:3000",
    CORS_ORIGIN: ORIGIN,
    AUTH_DEV_LOGIN: "true",
    ...envOverrides,
  };
  for (const [key, value] of Object.entries(environment)) {
    if (value === "") vi.stubEnv(key, undefined as unknown as string);
    else vi.stubEnv(key, value);
  }
  vi.resetModules();

  const clientModule = await import("../src/db/client.js");
  await clientModule.ensureSchema();
  const schema = await import("../src/db/schema.js");
  const { authRoutes } = await import("../src/api/routes/auth.js");

  let now = new Date("2026-10-08T15:00:00.000Z");
  let idToken: Record<string, unknown> | Error = {};
  const exchangeCalls: Harness["exchangeCalls"] = [];

  const app = Fastify();
  await app.register(
    authRoutes({
      now: () => now,
      exchangeCode: async (config) => {
        exchangeCalls.push({ code: config.code, clientSecret: config.clientSecret });
        if (idToken instanceof Error) throw idToken;
        return ["h", Buffer.from(JSON.stringify(idToken)).toString("base64url"), "s"].join(".");
      },
    }),
  );
  await app.ready();
  return { app, setNow: (date) => void (now = date), exchangeCalls, setIdToken: (claims) => void (idToken = claims), db: clientModule.db, schema };
}

function cookiesFrom(response: { headers: Record<string, unknown> }): string[] {
  const header = response.headers["set-cookie"];
  return Array.isArray(header) ? (header as string[]) : header ? [header as string] : [];
}

/** "name=value" for the cookie with that name, ready to send back as a Cookie header. */
function cookiePair(response: { headers: Record<string, unknown> }, name: string): string | undefined {
  return cookiesFrom(response)
    .find((c) => c.startsWith(`${name}=`))
    ?.split(";")[0];
}

afterEach(() => vi.unstubAllEnvs());
afterAll(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe("signed-out visitor", () => {
  let h: Harness;
  beforeEach(async () => void (h = await buildHarness()));

  it("is told there is no user, and what sign-in options exist", async () => {
    const response = await h.app.inject("/api/me");
    expect(response.json()).toEqual({ user: null, loginAvailable: true, devLogin: true });
  });

  it("is never served a cached answer about who they are", async () => {
    for (const path of ["/api/me", "/api/preferences"]) {
      expect((await h.app.inject(path)).headers["cache-control"]).toBe("no-store");
    }
  });

  it("cannot read or write preferences", async () => {
    expect((await h.app.inject("/api/preferences")).statusCode).toBe(401);
    const put = await h.app.inject({ method: "PUT", url: "/api/preferences", headers: { origin: ORIGIN }, payload: { teams: [], channels: [] } });
    expect(put.statusCode).toBe(401);
  });

  it("gets nothing from a forged or empty session cookie", async () => {
    for (const cookie of ["ovp_session=made-up-token", "ovp_session=", "ovp_session"]) {
      expect((await h.app.inject({ url: "/api/me", headers: { cookie } })).json().user).toBeNull();
    }
  });
});

describe("signed-in visitor (test login)", () => {
  let h: Harness;
  let cookie: string;
  beforeEach(async () => {
    h = await buildHarness();
    const login = await h.app.inject("/api/auth-dev?email=ana@example.com");
    cookie = cookiePair(login, "ovp_session") as string;
  });

  it("is sent back to the site and given a session cookie that scripts cannot read", async () => {
    const login = await h.app.inject("/api/auth-dev?email=ana@example.com");
    expect(login.statusCode).toBe(302);
    expect(login.headers.location).toBe(`${ORIGIN}/?login=ok`);
    const header = cookiesFrom(login).find((c) => c.startsWith("ovp_session="))!;
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain(`Max-Age=${30 * 24 * 60 * 60}`);
    expect(header).not.toContain("Secure"); // the dev site is http
  });

  it("is recognised on the next request", async () => {
    const me = await h.app.inject({ url: "/api/me", headers: { cookie } });
    expect(me.json().user).toEqual({ email: "ana@example.com" });
  });

  it("keeps its preferences and gets them back", async () => {
    const put = await h.app.inject({
      method: "PUT",
      url: "/api/preferences",
      headers: { cookie, origin: ORIGIN },
      payload: { teams: ["flamengo"], channels: ["espn"] },
    });
    expect(put.statusCode).toBe(200);
    const get = await h.app.inject({ url: "/api/preferences", headers: { cookie } });
    expect(get.json()).toMatchObject({ teams: ["flamengo"], channels: ["espn"] });
    expect(get.json().updatedAt).toBe("2026-10-08T15:00:00.000Z");
  });

  it("starts with empty preferences and no save time", async () => {
    expect((await h.app.inject({ url: "/api/preferences", headers: { cookie } })).json()).toEqual({ teams: [], channels: [], updatedAt: null });
  });

  it("only stores ids the site knows, once each", async () => {
    await h.app.inject({
      method: "PUT",
      url: "/api/preferences",
      headers: { cookie, origin: ORIGIN },
      payload: { teams: ["flamengo", "flamengo", "inventado"], channels: ["espn", "canal-falso"] },
    });
    expect((await h.app.inject({ url: "/api/preferences", headers: { cookie } })).json()).toMatchObject({ teams: ["flamengo"], channels: ["espn"] });
  });

  it("rejects a malformed body", async () => {
    const put = await h.app.inject({ method: "PUT", url: "/api/preferences", headers: { cookie, origin: ORIGIN }, payload: { teams: "x" } });
    expect(put.statusCode).toBe(400);
  });

  // The CSRF defence: the cookie rides along on a request another site makes
  // from the victim's browser, so a state change needs a trusted Origin too.
  it("refuses to change anything when the request has no Origin, or a foreign one", async () => {
    const body = { teams: ["flamengo"], channels: [] };
    const none = await h.app.inject({ method: "PUT", url: "/api/preferences", headers: { cookie }, payload: body });
    const foreign = await h.app.inject({ method: "PUT", url: "/api/preferences", headers: { cookie, origin: "https://evil.example" }, payload: body });
    expect(none.statusCode).toBe(403);
    expect(foreign.statusCode).toBe(403);
    for (const method of ["POST", "DELETE"] as const) {
      const url = method === "POST" ? "/api/logout" : "/api/account";
      expect((await h.app.inject({ method, url, headers: { cookie, origin: "https://evil.example" } })).statusCode).toBe(403);
    }
    // and none of that touched the account
    expect((await h.app.inject({ url: "/api/preferences", headers: { cookie } })).json().teams).toEqual([]);
    expect((await h.app.inject({ url: "/api/me", headers: { cookie } })).json().user).not.toBeNull();
  });

  it("keeps one person's preferences from another", async () => {
    await h.app.inject({ method: "PUT", url: "/api/preferences", headers: { cookie, origin: ORIGIN }, payload: { teams: ["flamengo"], channels: [] } });
    const otherLogin = await h.app.inject("/api/auth-dev?email=bia@example.com");
    const other = cookiePair(otherLogin, "ovp_session") as string;
    expect((await h.app.inject({ url: "/api/preferences", headers: { cookie: other } })).json().teams).toEqual([]);
  });

  it("is the same account on a second sign-in, with the same preferences", async () => {
    await h.app.inject({ method: "PUT", url: "/api/preferences", headers: { cookie, origin: ORIGIN }, payload: { teams: ["flamengo"], channels: [] } });
    const again = cookiePair(await h.app.inject("/api/auth-dev?email=ana@example.com"), "ovp_session") as string;
    expect((await h.app.inject({ url: "/api/preferences", headers: { cookie: again } })).json().teams).toEqual(["flamengo"]);
    expect(await h.db.select().from(h.schema.users)).toHaveLength(1);
  });

  // A leaked database must not be replayable as logins.
  it("stores a hash of the session token, never the token", async () => {
    const token = decodeURIComponent(cookie.split("=")[1]);
    const rows = await h.db.select().from(h.schema.sessions);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.idHash).not.toBe(token);
      expect(JSON.stringify(row)).not.toContain(token);
    }
  });

  it("stops being recognised after 30 days", async () => {
    h.setNow(new Date("2026-11-08T15:00:00.000Z")); // 31 days on
    expect((await h.app.inject({ url: "/api/me", headers: { cookie } })).json().user).toBeNull();
  });

  describe("signing out", () => {
    it("ends the session on the server, so the old cookie is dead even if someone kept a copy", async () => {
      const out = await h.app.inject({ method: "POST", url: "/api/logout", headers: { cookie, origin: ORIGIN } });
      expect(out.statusCode).toBe(200);
      expect(cookiesFrom(out).find((c) => c.startsWith("ovp_session="))).toContain("Max-Age=0");
      expect((await h.app.inject({ url: "/api/me", headers: { cookie } })).json().user).toBeNull();
      expect((await h.app.inject({ url: "/api/preferences", headers: { cookie } })).statusCode).toBe(401);
    });

    it("leaves the account and its preferences in place for the next sign-in", async () => {
      await h.app.inject({ method: "PUT", url: "/api/preferences", headers: { cookie, origin: ORIGIN }, payload: { teams: ["flamengo"], channels: [] } });
      await h.app.inject({ method: "POST", url: "/api/logout", headers: { cookie, origin: ORIGIN } });
      const again = cookiePair(await h.app.inject("/api/auth-dev?email=ana@example.com"), "ovp_session") as string;
      expect((await h.app.inject({ url: "/api/preferences", headers: { cookie: again } })).json().teams).toEqual(["flamengo"]);
    });
  });

  describe("deleting the account", () => {
    it("removes the user, the preferences and every session, and signs out", async () => {
      await h.app.inject({ method: "PUT", url: "/api/preferences", headers: { cookie, origin: ORIGIN }, payload: { teams: ["flamengo"], channels: ["espn"] } });
      const secondDevice = cookiePair(await h.app.inject("/api/auth-dev?email=ana@example.com"), "ovp_session") as string;

      const deleted = await h.app.inject({ method: "DELETE", url: "/api/account", headers: { cookie, origin: ORIGIN } });
      expect(deleted.statusCode).toBe(200);
      expect(cookiesFrom(deleted).find((c) => c.startsWith("ovp_session="))).toContain("Max-Age=0");

      expect(await h.db.select().from(h.schema.users)).toHaveLength(0);
      expect(await h.db.select().from(h.schema.userPreferences)).toHaveLength(0);
      expect(await h.db.select().from(h.schema.sessions)).toHaveLength(0);
      // the OTHER device's session died with it
      expect((await h.app.inject({ url: "/api/me", headers: { cookie: secondDevice } })).json().user).toBeNull();
    });

    it("leaves every other account alone", async () => {
      const other = cookiePair(await h.app.inject("/api/auth-dev?email=bia@example.com"), "ovp_session") as string;
      await h.app.inject({ method: "PUT", url: "/api/preferences", headers: { cookie: other, origin: ORIGIN }, payload: { teams: ["santos"], channels: [] } });
      await h.app.inject({ method: "DELETE", url: "/api/account", headers: { cookie, origin: ORIGIN } });
      expect((await h.app.inject({ url: "/api/preferences", headers: { cookie: other } })).json().teams).toEqual(["santos"]);
    });
  });
});

describe("Google sign-in", () => {
  let h: Harness;
  beforeEach(async () => void (h = await buildHarness()));

  const goodClaims = (nonce: string, override: Record<string, unknown> = {}) => ({
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "google-subject-1",
    exp: Math.floor(new Date("2026-10-08T15:00:00.000Z").getTime() / 1000) + 3600,
    nonce,
    email: "carla@gmail.com",
    email_verified: true,
    ...override,
  });

  /** Starts a sign-in and returns the cookie, state and nonce it issued. */
  async function start() {
    const response = await h.app.inject("/api/auth-google");
    const location = new URL(response.headers.location as string);
    const pair = cookiePair(response, "ovp_oauth") as string;
    return { response, location, pair, state: location.searchParams.get("state") as string, nonce: location.searchParams.get("nonce") as string };
  }

  it("sends the browser to Google with a state and nonce it also keeps in a short-lived cookie", async () => {
    const { response, location, state, nonce } = await start();
    expect(response.statusCode).toBe(302);
    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(location.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth-google-callback");
    expect(location.searchParams.get("scope")).toBe("openid email");
    const header = cookiesFrom(response).find((c) => c.startsWith("ovp_oauth="))!;
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Path=/api");
    expect(header).toContain("Max-Age=600");
    expect(decodeURIComponent(header.split(";")[0])).toBe(`ovp_oauth=${state}.${nonce}`);
  });

  it("never puts the client secret in the URL it sends the browser to", async () => {
    const { location } = await start();
    expect(location.toString()).not.toContain("the-client-secret");
  });

  it("signs the person in when everything checks out, and creates their account", async () => {
    const { pair, state, nonce } = await start();
    h.setIdToken(goodClaims(nonce));
    const callback = await h.app.inject({ url: `/api/auth-google-callback?code=abc&state=${state}`, headers: { cookie: pair } });

    expect(callback.statusCode).toBe(302);
    expect(callback.headers.location).toBe(`${ORIGIN}/?login=ok`);
    const session = cookiePair(callback, "ovp_session") as string;
    expect(session).toBeDefined();
    expect((await h.app.inject({ url: "/api/me", headers: { cookie: session } })).json().user).toEqual({ email: "carla@gmail.com" });
    // the one-time cookie is spent
    expect(cookiesFrom(callback).find((c) => c.startsWith("ovp_oauth="))).toContain("Max-Age=0");
    // the code went to the exchange, with the secret that only the server has
    expect(h.exchangeCalls).toEqual([{ code: "abc", clientSecret: "the-client-secret" }]);
  });

  it("recognises the same Google account next time instead of making a second one", async () => {
    for (let i = 0; i < 2; i++) {
      const { pair, state, nonce } = await start();
      h.setIdToken(goodClaims(nonce));
      await h.app.inject({ url: `/api/auth-google-callback?code=abc&state=${state}`, headers: { cookie: pair } });
    }
    expect(await h.db.select().from(h.schema.users)).toHaveLength(1);
  });

  // The login-CSRF defence: an attacker starts a sign-in and feeds the callback
  // URL to a victim, trying to log the victim into the attacker's account.
  it("refuses a callback whose state doesn't match the one this browser started", async () => {
    const { pair, nonce } = await start();
    h.setIdToken(goodClaims(nonce));
    const callback = await h.app.inject({ url: "/api/auth-google-callback?code=abc&state=attacker-chosen", headers: { cookie: pair } });
    expect(callback.headers.location).toBe(`${ORIGIN}/?login=falhou`);
    expect(cookiePair(callback, "ovp_session")).toBeUndefined();
    expect(h.exchangeCalls).toHaveLength(0); // didn't even spend the code
  });

  it("refuses a callback from a browser that never started a sign-in", async () => {
    const callback = await h.app.inject("/api/auth-google-callback?code=abc&state=whatever");
    expect(callback.headers.location).toBe(`${ORIGIN}/?login=falhou`);
    expect(cookiePair(callback, "ovp_session")).toBeUndefined();
  });

  it("treats the person pressing 'cancel' at Google as a failure, quietly", async () => {
    const { pair, state } = await start();
    const callback = await h.app.inject({ url: `/api/auth-google-callback?error=access_denied&state=${state}`, headers: { cookie: pair } });
    expect(callback.headers.location).toBe(`${ORIGIN}/?login=falhou`);
    expect(cookiePair(callback, "ovp_session")).toBeUndefined();
  });

  it("refuses when Google can't be reached or refuses the code", async () => {
    const { pair, state } = await start();
    h.setIdToken(new Error("Google token endpoint answered HTTP 400"));
    const callback = await h.app.inject({ url: `/api/auth-google-callback?code=abc&state=${state}`, headers: { cookie: pair } });
    expect(callback.headers.location).toBe(`${ORIGIN}/?login=falhou`);
    expect(cookiePair(callback, "ovp_session")).toBeUndefined();
  });

  it.each([
    ["issued to another app", { aud: "another-client" }],
    ["expired", { exp: 1 }],
    ["an unverified e-mail", { email_verified: false }],
    ["from another issuer", { iss: "https://evil.example" }],
  ])("refuses a token that is %s", async (_name, override) => {
    const { pair, state, nonce } = await start();
    h.setIdToken(goodClaims(nonce, override));
    const callback = await h.app.inject({ url: `/api/auth-google-callback?code=abc&state=${state}`, headers: { cookie: pair } });
    expect(callback.headers.location).toBe(`${ORIGIN}/?login=falhou`);
    expect(cookiePair(callback, "ovp_session")).toBeUndefined();
    expect(await h.db.select().from(h.schema.users)).toHaveLength(0);
  });

  it("refuses a token carrying a nonce from some other sign-in (a replay)", async () => {
    const { pair, state } = await start();
    h.setIdToken(goodClaims("nonce-from-a-different-sign-in"));
    const callback = await h.app.inject({ url: `/api/auth-google-callback?code=abc&state=${state}`, headers: { cookie: pair } });
    expect(callback.headers.location).toBe(`${ORIGIN}/?login=falhou`);
    expect(cookiePair(callback, "ovp_session")).toBeUndefined();
  });

  it("only ever redirects to the configured site, whatever the request says", async () => {
    const { pair, state, nonce } = await start();
    h.setIdToken(goodClaims(nonce));
    const callback = await h.app.inject({
      url: `/api/auth-google-callback?code=abc&state=${state}&next=https://evil.example&redirect=https://evil.example`,
      headers: { cookie: pair },
    });
    expect(callback.headers.location).toBe(`${ORIGIN}/?login=ok`);
  });
});

describe("deployments without credentials", () => {
  it("switch accounts off: no login, and /api/me says so", async () => {
    const h = await buildHarness({ GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" });
    expect((await h.app.inject("/api/me")).json().loginAvailable).toBe(false);
    expect((await h.app.inject("/api/auth-google")).statusCode).toBe(503);
    const callback = await h.app.inject("/api/auth-google-callback?code=a&state=b");
    expect(callback.headers.location).toBe(`${ORIGIN}/?login=falhou`);
  });
});

describe("the test login", () => {
  it("is not there at all unless explicitly switched on", async () => {
    const h = await buildHarness({ AUTH_DEV_LOGIN: "" });
    expect((await h.app.inject("/api/auth-dev")).statusCode).toBe(404);
    expect((await h.app.inject("/api/me")).json().devLogin).toBe(false);
  });

  // The one that matters: it signs anyone in as anyone, so a stray env var in
  // production must not be able to switch it on.
  it("is not registered in production even when AUTH_DEV_LOGIN is set", async () => {
    const h = await buildHarness({ AUTH_DEV_LOGIN: "true", NODE_ENV: "production" });
    expect((await h.app.inject("/api/auth-dev?email=x@example.com")).statusCode).toBe(404);
    expect((await h.app.inject("/api/me")).json().devLogin).toBe(false);
  });
});
