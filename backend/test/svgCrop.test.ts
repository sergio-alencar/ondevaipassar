import { describe, expect, it } from "vitest";
import { cropSvgToContent } from "../src/lib/svgCrop.js";

// A square canvas with a circle only occupying its middle band vertically —
// same shape every real "needs cropping" crest has (padding above/below or
// beside the actual silhouette).
function paddedSvg(extraRootAttrs = ""): string {
  return `<svg width="500" height="500" viewBox="0 0 500 500"${extraRootAttrs} xmlns="http://www.w3.org/2000/svg"><circle cx="250" cy="250" r="100" fill="red"/></svg>`;
}

describe("cropSvgToContent", () => {
  it("tightens the viewBox to the real content, not the full canvas", () => {
    const { svg, aspectRatio } = cropSvgToContent(Buffer.from(paddedSvg()));
    const text = svg.toString("utf-8");
    expect(text).not.toContain('viewBox="0 0 500 500"');
    expect(aspectRatio).toBeCloseTo(1, 1); // a circle is still ~square once tightly cropped.
  });

  it("preserves a root fill=\"none\" instead of dropping it — some crests have a path with no fill of its own that depends on inheriting it to stay invisible", () => {
    const { svg } = cropSvgToContent(Buffer.from(paddedSvg(' fill="none"')));
    expect(svg.toString("utf-8")).toContain('fill="none"');
  });

  it("doesn't add a fill=\"none\" that wasn't in the original — some crests define color via a <style> class, which a root fill=\"none\" overrides and blanks out", () => {
    const { svg } = cropSvgToContent(Buffer.from(paddedSvg()));
    expect(svg.toString("utf-8")).not.toMatch(/<svg[^>]*fill="none"/);
  });

  it("preserves unrelated namespace declarations on the root tag (e.g. xmlns:rdf for embedded metadata elsewhere in the file)", () => {
    const svg = paddedSvg(' xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"');
    const { svg: cropped } = cropSvgToContent(Buffer.from(svg));
    expect(cropped.toString("utf-8")).toContain("xmlns:rdf=");
  });

  it("returns the input unchanged when there's no viewBox to work from", () => {
    const svg = Buffer.from('<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>');
    const { svg: result, aspectRatio } = cropSvgToContent(svg);
    expect(result).toBe(svg);
    expect(aspectRatio).toBe(1);
  });
});
