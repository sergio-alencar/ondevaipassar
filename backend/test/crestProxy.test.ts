import { describe, expect, it } from "vitest";
import { isAllowedCrestUrl } from "../src/api/routes/crestProxy.js";

describe("isAllowedCrestUrl", () => {
  it("allows an https URL on the real crest CDN host", () => {
    expect(isAllowedCrestUrl("https://s.sde.globo.com/media/organizations/2018/04/10/Flamengo-2018.svg")).toBe(true);
  });

  it("rejects a different host, even a plausible-looking or subdomain one", () => {
    expect(isAllowedCrestUrl("https://evil.example.com/x.svg")).toBe(false);
    expect(isAllowedCrestUrl("https://s.sde.globo.com.evil.example.com/x.svg")).toBe(false);
    expect(isAllowedCrestUrl("https://sde.globo.com/x.svg")).toBe(false);
  });

  it("rejects non-https (including a scheme swap on the same host)", () => {
    expect(isAllowedCrestUrl("http://s.sde.globo.com/x.svg")).toBe(false);
    expect(isAllowedCrestUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects a malformed URL instead of throwing", () => {
    expect(isAllowedCrestUrl("not a url")).toBe(false);
    expect(isAllowedCrestUrl("")).toBe(false);
  });
});
