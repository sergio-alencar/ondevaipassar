import { Resvg } from "@resvg/resvg-js";

/**
 * Crops an SVG to what is actually visible. Source files often carry a lot of
 * empty canvas — or text hidden behind a clip-path, or a full-canvas white
 * rectangle — so the box is measured from a render on white, not read from the
 * file's own numbers.
 *
 * `viewBoxOverride` ("0 0 1000 1320") replaces the file's own viewBox when it
 * is wrong: some exports declare one that cuts the drawing off.
 */
export function cropSvg(source: string, viewBoxOverride?: string): { svg: string; from: [number, number]; to: [number, number] } {
  const tag = source.match(/<svg\b[^>]*>/)![0];
  const viewBoxAttribute = viewBoxOverride ?? tag.match(/viewBox="([^"]+)"/)?.[1];
  const width = Number(tag.match(/\bwidth="([\d.]+)/)?.[1]);
  const height = Number(tag.match(/\bheight="([\d.]+)/)?.[1]);
  const vb = viewBoxAttribute ? viewBoxAttribute.split(/[ ,]+/).map(Number) : [0, 0, width, height];

  // Render from the viewBox alone: a width/height that disagrees with its aspect
  // would letterbox the drawing and shift every coordinate measured below.
  const stripped = tag.replace(/\s(width|height|viewBox)="[^"]*"/g, "").replace("<svg", `<svg viewBox="${vb.join(" ")}"`);
  const render = new Resvg(source.replace(tag, stripped), { fitTo: { mode: "width", value: 2000 }, background: "white" }).render();
  const { width: pixelWidth, height: pixelHeight, pixels } = render;

  let x0 = pixelWidth, y0 = pixelHeight, x1 = 0, y1 = 0;
  for (let y = 0; y < pixelHeight; y++) {
    for (let x = 0; x < pixelWidth; x++) {
      const i = (y * pixelWidth + x) * 4;
      if (Math.abs(pixels[i] - 255) + Math.abs(pixels[i + 1] - 255) + Math.abs(pixels[i + 2] - 255) > 14) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
  }

  const scale = vb[2] / pixelWidth;
  const pad = 0.02 * Math.max(x1 - x0, y1 - y0);
  const left = Math.max(x0 - pad, 0), top = Math.max(y0 - pad, 0);
  const cropWidth = Math.min(x1 + pad, pixelWidth) - left, cropHeight = Math.min(y1 + pad, pixelHeight) - top;
  const box = [vb[0] + left * scale, vb[1] + top * scale, cropWidth * scale, cropHeight * scale];

  const cropped = stripped.replace(/viewBox="[^"]+"/, `viewBox="${box.map((v) => v.toFixed(2)).join(" ")}" width="${box[2].toFixed(0)}" height="${box[3].toFixed(0)}"`);
  return { svg: source.replace(tag, cropped), from: [vb[2], vb[3]], to: [box[2], box[3]] };
}
