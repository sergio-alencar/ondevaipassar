import { Resvg } from "@resvg/resvg-js";

/**
 * Takes the stars of title ("estrelas de campeão") off a crest.
 *
 * The site does not show title stars on any crest (it never did for clubs),
 * and for a national team they are also the one thing that differs between its
 * men's and women's crests. Finding them does not need to understand the SVG:
 * the crest is rendered, and any connected blob of pixels, separate from the
 * rest, that has the shape of a five-pointed star is one. A star that touches
 * the shield, or sits inside it (Paraguay's, Vietnam's), is part of the
 * drawing and is left alone — only floating stars qualify, which is exactly
 * what title stars are.
 *
 * Removal does not edit the paths (they can hold several stars in one `d`):
 * the content is wrapped in a clip-path that is everything EXCEPT a slightly
 * enlarged star at each spot.
 */

const RENDER_WIDTH = 1200;
const ALPHA_THRESHOLD = 40;
const TEMPLATE = 40;
const MIN_IOU = 0.74;
const GROW = 1.18;

interface Blob {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  pixels: number;
  mask: Uint8Array;
  width: number;
}

/** The outline of a five-pointed star: outer radius 1, inner radius `inner`, rotated by `turn` radians. */
function starPoints(inner: number, turn: number): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 1 : inner;
    const angle = turn - Math.PI / 2 + (i * Math.PI) / 5;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return points;
}

function bounds(points: [number, number][]): { x0: number; y0: number; x1: number; y1: number } {
  return {
    x0: Math.min(...points.map((p) => p[0])),
    y0: Math.min(...points.map((p) => p[1])),
    x1: Math.max(...points.map((p) => p[0])),
    y1: Math.max(...points.map((p) => p[1])),
  };
}

function inside(point: [number, number], polygon: [number, number][]): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) result = !result;
  }
  return result;
}

/** A star rasterised into its own bounding box, TEMPLATE x TEMPLATE. */
function templateMask(inner: number, turn: number): Uint8Array {
  const polygon = starPoints(inner, turn);
  const b = bounds(polygon);
  const mask = new Uint8Array(TEMPLATE * TEMPLATE);
  for (let y = 0; y < TEMPLATE; y += 1) {
    for (let x = 0; x < TEMPLATE; x += 1) {
      const px = b.x0 + ((x + 0.5) / TEMPLATE) * (b.x1 - b.x0);
      const py = b.y0 + ((y + 0.5) / TEMPLATE) * (b.y1 - b.y0);
      mask[y * TEMPLATE + x] = inside([px, py], polygon) ? 1 : 0;
    }
  }
  return mask;
}

const TEMPLATES: { inner: number; turn: number; mask: Uint8Array }[] = [];
for (const inner of [0.382, 0.45, 0.52]) {
  for (let degrees = 0; degrees < 72; degrees += 6) TEMPLATES.push({ inner, turn: (degrees * Math.PI) / 180, mask: templateMask(inner, (degrees * Math.PI) / 180) });
}

function blobMask(blob: Blob, alpha: Uint8Array, width: number): Uint8Array {
  const w = blob.x1 - blob.x0 + 1;
  const h = blob.y1 - blob.y0 + 1;
  const mask = new Uint8Array(TEMPLATE * TEMPLATE);
  for (let y = 0; y < TEMPLATE; y += 1) {
    for (let x = 0; x < TEMPLATE; x += 1) {
      const sx = blob.x0 + Math.min(w - 1, Math.floor(((x + 0.5) / TEMPLATE) * w));
      const sy = blob.y0 + Math.min(h - 1, Math.floor(((y + 0.5) / TEMPLATE) * h));
      mask[y * TEMPLATE + x] = alpha[sy * width + sx] > ALPHA_THRESHOLD ? 1 : 0;
    }
  }
  return mask;
}

function iou(a: Uint8Array, b: Uint8Array): number {
  let both = 0;
  let either = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] && b[i]) both += 1;
    if (a[i] || b[i]) either += 1;
  }
  return either === 0 ? 0 : both / either;
}

export interface FoundStar {
  /** Centre and half-size in the SVG's own user units. */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  inner: number;
  turn: number;
  score: number;
}

export function findStars(source: string): { stars: FoundStar[]; viewBox: number[] } {
  const tag = source.match(/<svg\b[^>]*>/)![0];
  const viewBoxText = tag.match(/viewBox="([^"]+)"/)?.[1];
  const width = Number(tag.match(/\bwidth="([\d.]+)/)?.[1]);
  const height = Number(tag.match(/\bheight="([\d.]+)/)?.[1]);
  const vb = viewBoxText ? viewBoxText.split(/[ ,]+/).map(Number) : [0, 0, width, height];
  const stripped = tag.replace(/\s(width|height|viewBox)="[^"]*"/g, "").replace("<svg", `<svg viewBox="${vb.join(" ")}"`);
  const render = new Resvg(source.replace(tag, stripped), { fitTo: { mode: "width", value: RENDER_WIDTH } }).render();
  const { width: pw, height: ph, pixels } = render;

  const alpha = new Uint8Array(pw * ph);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = pixels[i * 4 + 3];

  const seen = new Uint8Array(pw * ph);
  const blobs: Blob[] = [];
  const stack: number[] = [];
  for (let start = 0; start < alpha.length; start += 1) {
    if (seen[start] || alpha[start] <= ALPHA_THRESHOLD) continue;
    let x0 = pw, y0 = ph, x1 = 0, y1 = 0, count = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const index = stack.pop()!;
      const x = index % pw;
      const y = (index - x) / pw;
      count += 1;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= pw || ny >= ph) continue;
          const next = ny * pw + nx;
          if (!seen[next] && alpha[next] > ALPHA_THRESHOLD) {
            seen[next] = 1;
            stack.push(next);
          }
        }
      }
    }
    blobs.push({ x0, y0, x1, y1, pixels: count, mask: new Uint8Array(0), width: pw });
  }

  const scale = vb[2] / pw;
  const stars: FoundStar[] = [];
  for (const blob of blobs) {
    const w = blob.x1 - blob.x0 + 1;
    const h = blob.y1 - blob.y0 + 1;
    // A title star is small next to the crest (never more than an eighth of its area), and roughly as wide as tall.
    if (w * h > pw * ph * 0.12 || blob.pixels < 30) continue;
    if (w / h > 1.25 || h / w > 1.25) continue;
    const mask = blobMask(blob, alpha, pw);
    let best = { score: 0, inner: 0, turn: 0 };
    for (const template of TEMPLATES) {
      const score = iou(mask, template.mask);
      if (score > best.score) best = { score, inner: template.inner, turn: template.turn };
    }
    if (best.score < MIN_IOU) continue;
    stars.push({
      cx: vb[0] + ((blob.x0 + blob.x1 + 1) / 2) * scale,
      cy: vb[1] + ((blob.y0 + blob.y1 + 1) / 2) * scale,
      rx: (w / 2) * scale,
      ry: (h / 2) * scale,
      inner: best.inner,
      turn: best.turn,
      score: best.score,
    });
  }
  return { stars, viewBox: vb };
}

/** The same SVG with every floating star clipped away, or the source untouched when it has none. */
export function removeStars(source: string): { svg: string; removed: number; scores: number[] } {
  const { stars, viewBox } = findStars(source);
  if (stars.length === 0) return { svg: source, removed: 0, scores: [] };

  const [vx, vy, vw, vh] = viewBox;
  let path = `M${vx} ${vy}H${vx + vw}V${vy + vh}H${vx}Z`;
  for (const star of stars) {
    const polygon = starPoints(star.inner, star.turn);
    const b = bounds(polygon);
    const points = polygon.map(([x, y]) => {
      const nx = (x - (b.x0 + b.x1) / 2) / ((b.x1 - b.x0) / 2);
      const ny = (y - (b.y0 + b.y1) / 2) / ((b.y1 - b.y0) / 2);
      return [star.cx + nx * star.rx * GROW, star.cy + ny * star.ry * GROW];
    });
    path += `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z`;
  }

  const open = source.match(/<svg\b[^>]*>/)!;
  const end = source.lastIndexOf("</svg>");
  const wrapped =
    source.slice(0, open.index! + open[0].length) +
    `<defs><clipPath id="sem-estrelas"><path clip-rule="evenodd" d="${path}"/></clipPath></defs><g clip-path="url(#sem-estrelas)">` +
    source.slice(open.index! + open[0].length, end) +
    "</g>" +
    source.slice(end);
  return { svg: wrapped, removed: stars.length, scores: stars.map((s) => Number(s.score.toFixed(2))) };
}
