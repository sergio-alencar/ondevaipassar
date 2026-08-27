import { describe, expect, it } from "vitest";
import { abbreviateTeamName } from "../src/instagram/teamNameAbbreviation.js";

describe("abbreviateTeamName", () => {
  it("shortens a dictionary word regardless of accent/case", () => {
    expect(abbreviateTeamName("Universidad Católica")).toBe("Univ. Católica");
    expect(abbreviateTeamName("UNIVERSIDADE")).toBe("Univ.");
  });

  it("leaves words with no dictionary entry untouched", () => {
    expect(abbreviateTeamName("Palmeiras")).toBe("Palmeiras");
  });

  it("shortens every matching word in a multi-word name", () => {
    expect(abbreviateTeamName("Club Atlético Deportivo")).toBe("Club Atl. Dep.");
  });
});
