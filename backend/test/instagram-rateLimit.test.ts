import { describe, expect, it } from "vitest";
import { isRateLimited } from "../src/instagram/poster.js";

// The exact error string Meta returned during the 2026-09-05 incident, kept
// verbatim — this is the one shape that has to be recognized, since missing
// it is what let the retry loop keep hammering a blocked account.
const REAL_BLOCK_ERROR = new Error(
  'Instagram Graph API error (HTTP 403): {"error":{"message":"Application request limit reached","type":"OAuthException","is_transient":false,"code":4,"error_subcode":2207051,"error_user_title":"action is blocked","error_user_msg":"We restrict certain activity to protect our community. Tell us if you think we made a mistake.","fbtrace_id":"APZFg6mxXnykKvlysZMLVvq"}}',
);

describe("isRateLimited", () => {
  it("recognizes the real 'Application request limit reached' block from the incident", () => {
    expect(isRateLimited(REAL_BLOCK_ERROR)).toBe(true);
  });

  it("does not treat an ordinary posting failure as a block", () => {
    expect(isRateLimited(new Error("Timed out waiting for media container 123 to finish processing"))).toBe(false);
    expect(isRateLimited(new Error("Instagram failed to process the media container 123 (status: ERROR)"))).toBe(false);
  });
});
