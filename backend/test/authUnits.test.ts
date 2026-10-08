import { describe, expect, it } from "vitest";
import { clearCookie, parseCookies, serializeCookie } from "../src/auth/cookies.js";
import { buildGoogleAuthUrl, readIdTokenClaims, validateIdTokenClaims } from "../src/auth/google.js";
import { isAllowedOrigin } from "../src/auth/origin.js";
import { sanitizePreferences } from "../src/auth/preferences.js";
import { hashToken, newToken, safeEqual } from "../src/auth/tokens.js";

describe("cookies", () => {
  it("reads several cookies and decodes their values", () => {
    expect(parseCookies("a=1; b=hello%20world; ovp_session=abc.def")).toEqual({ a: "1", b: "hello world", ovp_session: "abc.def" });
  });

  it("copes with a missing header, empty pairs and an undecodable value, without throwing", () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies("")).toEqual({});
    expect(parseCookies("novalue; =x; ok=1; bad=%E0%A4%A")).toEqual({ ok: "1" });
  });

  it("sets HttpOnly and SameSite=Lax unless told otherwise — the safe defaults", () => {
    const header = serializeCookie("ovp_session", "tok", { maxAgeSeconds: 100 });
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Max-Age=100");
    expect(header).toContain("Path=/");
    expect(header).not.toContain("Secure");
  });

  it("adds Secure and Domain when asked", () => {
    const header = serializeCookie("s", "v", { secure: true, domain: ".ondevaipassar.com" });
    expect(header).toContain("Secure");
    expect(header).toContain("Domain=.ondevaipassar.com");
  });

  it("encodes the value so it can't end the cookie or the header", () => {
    expect(serializeCookie("s", "a;b\r\nSet-Cookie: x=1")).not.toMatch(/[;\r\n]\s*Set-Cookie/);
    expect(serializeCookie("s", "a;b").split(";")[0]).toBe("s=a%3Bb");
  });

  it("refuses a name, domain or path that could inject another attribute or header", () => {
    expect(() => serializeCookie("bad name", "v")).toThrow();
    expect(() => serializeCookie("a;b", "v")).toThrow();
    expect(() => serializeCookie("s", "v", { domain: "x.com; Secure" })).toThrow();
    expect(() => serializeCookie("s", "v", { path: "/\r\nX: y" })).toThrow();
  });

  // The attributes must match those it was set with, or the browser keeps the original.
  it("clears a cookie with an expired Max-Age and the same path and domain", () => {
    const header = clearCookie("ovp_session", { path: "/api", domain: ".ondevaipassar.com", secure: true });
    expect(header).toContain("Max-Age=0");
    expect(header).toContain("Path=/api");
    expect(header).toContain("Domain=.ondevaipassar.com");
  });
});

describe("tokens", () => {
  it("makes long, URL-safe, never-repeating tokens", () => {
    const tokens = new Set(Array.from({ length: 200 }, newToken));
    expect(tokens.size).toBe(200);
    for (const token of tokens) {
      expect(token.length).toBeGreaterThanOrEqual(43); // 256 bits in base64url
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // no "." — the OAuth cookie splits on it
    }
  });

  it("stores a one-way hash that isn't the token", () => {
    const token = newToken();
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(hashToken(newToken()));
  });

  it("compares in constant time, including strings of different lengths", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false); // would throw in timingSafeEqual without hashing first
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("google sign-in", () => {
  const expected = { clientId: "id.apps.googleusercontent.com", nonce: "the-nonce", nowSeconds: 1_000_000 };
  const good = {
    iss: "https://accounts.google.com",
    aud: expected.clientId,
    sub: "1234567890",
    exp: expected.nowSeconds + 3600,
    nonce: "the-nonce",
    email: "a@gmail.com",
    email_verified: true,
  };

  it("sends the person to Google asking only for openid and e-mail, with the state and nonce", () => {
    const url = new URL(buildGoogleAuthUrl({ clientId: "cid", redirectUri: "https://api.example/cb", state: "S", nonce: "N" }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("scope")).toBe("openid email");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("S");
    expect(url.searchParams.get("nonce")).toBe("N");
    expect(url.searchParams.get("redirect_uri")).toBe("https://api.example/cb");
    expect(url.searchParams.get("prompt")).toBe("select_account");
  });

  it("accepts a well-formed token and returns who it is", () => {
    expect(validateIdTokenClaims(good, expected)).toEqual({ ok: true, subject: "1234567890", email: "a@gmail.com" });
  });

  it("accepts either of Google's two issuer spellings and an audience list that contains us", () => {
    expect(validateIdTokenClaims({ ...good, iss: "accounts.google.com" }, expected).ok).toBe(true);
    expect(validateIdTokenClaims({ ...good, aud: ["other", expected.clientId] }, expected).ok).toBe(true);
  });

  // Each of these is a token that must NOT sign anyone in.
  it.each([
    ["a token issued to a different app (the confused-deputy case)", { aud: "someone-elses-client" }, "wrong audience"],
    ["a token from a different issuer", { iss: "https://evil.example" }, "wrong issuer"],
    ["an expired token", { exp: expected.nowSeconds - 1 }, "expired"],
    ["a token with no expiry", { exp: undefined }, "expired"],
    ["a replayed token, with another sign-in's nonce", { nonce: "another-nonce" }, "wrong nonce"],
    ["a token with no nonce", { nonce: undefined }, "wrong nonce"],
    ["an unverified e-mail", { email_verified: false }, "email not verified"],
    ["an e-mail_verified that is the string 'true' rather than true", { email_verified: "true" }, "email not verified"],
    ["no subject", { sub: "" }, "no subject"],
    ["no e-mail", { email: undefined }, "no email"],
  ])("rejects %s", (_name, override, reason) => {
    expect(validateIdTokenClaims({ ...good, ...override }, expected)).toEqual({ ok: false, reason });
  });

  it("rejects a missing payload", () => {
    expect(validateIdTokenClaims(null, expected)).toEqual({ ok: false, reason: "malformed token" });
  });

  it("reads a JWT payload, and returns null for anything that isn't one", () => {
    const jwt = ["h", Buffer.from(JSON.stringify(good)).toString("base64url"), "s"].join(".");
    expect(readIdTokenClaims(jwt)?.sub).toBe("1234567890");
    expect(readIdTokenClaims("only.two")).toBeNull();
    expect(readIdTokenClaims("a.!!!.c")).toBeNull();
    expect(readIdTokenClaims(`a.${Buffer.from("[1,2]").toString("base64url")}.c`)).not.toBeNull(); // an array is an object; sub is then undefined and validation rejects it
    expect(readIdTokenClaims(`a.${Buffer.from("not json").toString("base64url")}.c`)).toBeNull();
  });
});

describe("isAllowedOrigin", () => {
  const allowed = ["https://ondevaipassar.com", "http://localhost:5173"];

  it("accepts our own origins", () => {
    expect(isAllowedOrigin("https://ondevaipassar.com", allowed)).toBe(true);
  });

  it("refuses another site, a look-alike and a different scheme or port", () => {
    expect(isAllowedOrigin("https://evil.example", allowed)).toBe(false);
    expect(isAllowedOrigin("https://ondevaipassar.com.evil.example", allowed)).toBe(false);
    expect(isAllowedOrigin("http://ondevaipassar.com", allowed)).toBe(false);
    expect(isAllowedOrigin("http://localhost:5174", allowed)).toBe(false);
  });

  // The cookie is only ever sent by a browser, and a browser sends an Origin.
  it("refuses a request with no Origin at all", () => {
    expect(isAllowedOrigin(undefined, allowed)).toBe(false);
  });
});

describe("sanitizePreferences", () => {
  it("keeps known teams and channels", () => {
    expect(sanitizePreferences({ teams: ["flamengo", "corinthians_feminino"], channels: ["espn", "globo"] })).toEqual({
      teams: ["flamengo", "corinthians_feminino"],
      channels: ["espn", "globo"],
    });
  });

  it("drops ids that aren't in the registry, and collapses duplicates", () => {
    expect(sanitizePreferences({ teams: ["flamengo", "flamengo", "<script>", "nao_existe"], channels: ["espn", "canal-inventado"] })).toEqual({
      teams: ["flamengo"],
      channels: ["espn"],
    });
  });

  it.each([
    ["not an object", "oops"],
    ["null", null],
    ["missing a list", { teams: ["flamengo"] }],
    ["a list that isn't a list", { teams: "flamengo", channels: [] }],
    ["a non-string entry", { teams: [1], channels: [] }],
    ["an enormous entry", { teams: ["x".repeat(101)], channels: [] }],
    ["an enormous list", { teams: Array.from({ length: 501 }, () => "flamengo"), channels: [] }],
  ])("rejects %s", (_name, body) => {
    expect(sanitizePreferences(body)).toBeNull();
  });
});
