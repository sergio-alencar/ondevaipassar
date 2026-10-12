import { describe, expect, it } from "vitest";
import { removeStars } from "../scripts/removeStars.js";

const star = (cx: number, cy: number, r: number): string => {
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.42;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  });
  return `<polygon fill="#c9a227" points="${points.join(" ")}"/>`;
};

const crest = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260"><rect x="40" y="90" width="120" height="150" rx="20" fill="#0a4"/>${inner}</svg>`;

describe("removeStars", () => {
  it("clips away the stars that float above the crest and leaves the rest drawn", () => {
    const { svg, removed } = removeStars(crest(`${star(70, 40, 16)}${star(130, 40, 16)}`));
    expect(removed).toBe(2);
    expect(svg).toContain('clip-path="url(#sem-estrelas)"');
    expect(svg).toContain('<rect x="40" y="90"'); // the shield itself is untouched
  });

  // Paraguay's and Vietnam's stars are part of the drawing: inside the crest, so the same blob as it.
  it("keeps a star that sits on the crest", () => {
    const { removed, svg } = removeStars(crest(star(100, 150, 22)));
    expect(removed).toBe(0);
    expect(svg).not.toContain("sem-estrelas");
  });

  it("returns the source untouched when there are no stars", () => {
    const source = crest("");
    expect(removeStars(source)).toEqual({ svg: source, removed: 0, scores: [] });
  });

  it("does not mistake a round or square shape for a star", () => {
    const { removed } = removeStars(crest('<circle cx="100" cy="40" r="20" fill="#c00"/><rect x="20" y="20" width="30" height="30" fill="#00c"/>'));
    expect(removed).toBe(0);
  });
});
