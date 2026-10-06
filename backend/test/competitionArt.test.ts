import { COMPETITIONS } from "@ondevaipassar/shared";
import { describe, expect, it } from "vitest";
import { competitionLogoDataUri } from "../src/instagram/assets.js";

describe("competition logos", () => {
  // A caption is meant to sit UNDER a logo (Competition.logoCaption). One
  // registered without its art would print a lone line of text where the
  // logo should be, which reads as a broken cover.
  it("ships art for every competition that declares a logo caption", () => {
    const captioned = COMPETITIONS.filter((competition) => competition.logoCaption);
    expect(captioned.length).toBeGreaterThan(0);
    for (const competition of captioned) {
      expect(competitionLogoDataUri(competition.id), competition.id).not.toBeNull();
    }
  });
});
