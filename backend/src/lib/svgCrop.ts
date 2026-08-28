import { Resvg } from "@resvg/resvg-js";

// A crest's own SVG canvas doesn't tell us its real shape — a circular
// badge (e.g. Cruzeiro) fills a square canvas edge to edge, but a pointed
// shield (e.g. Flamengo) sits centered in the same square canvas with real
// transparent padding on the sides (every crest file declares a square
// viewBox regardless of the actual silhouette drawn inside it). Rendering
// every crest into an identical square box then puts a different visual
// gap between the crest and whatever sits next to it (a "x" between two
// crests, most visibly) depending on which shape it happened to be — a
// shield-style crest reads as sitting further away than a round one.
//
// Just computing the *right* aspect ratio and setting it as an <img>'s CSS
// width/height isn't enough on its own: objectFit:"contain" (or a
// browser's native aspect-ratio handling) fits based on the image's own
// *declared* viewBox aspect ratio, not a number computed from outside — a
// still-square-declared SVG placed in a non-square box still gets
// letterboxed, just along a different axis than before (confirmed by
// rendering and measuring pixel gaps: they came out unequal, not fixed).
// So this actually rewrites the SVG's own viewBox to tightly bound its
// content. Used both for local crest art (assets.ts, per-read, since
// crests are a large and still-growing set) and for hotlinked crests from
// an untracked opponent (crestProxy.ts route, per-request, since we don't
// control or want to permanently store every foreign club's art).
//
// Deliberately does NOT add `fill="none"` on the rewritten root tag (an
// earlier version did, matching the unrelated channel-logo crop script) —
// that broke files whose paths get their color from a class in a <style>
// block rather than a `fill` attribute of their own (confirmed: one real
// crest, Club Libertad's, rendered fully blank with it). Leaving fill
// unset lets each file's own content define its own color, same as the
// untouched original tag did.
export function cropSvgToContent(svg: Buffer): { svg: Buffer; aspectRatio: number } {
  const openTagMatch = svg.toString("utf-8").match(/<svg[^>]*viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"[^>]*>/);
  if (!openTagMatch) return { svg, aspectRatio: 1 }; // no viewBox to work from — render as-is rather than guess.
  const [, vbX, vbY, vbW, vbH] = openTagMatch.map(Number) as unknown as [number, number, number, number, number];

  // Render at a minimum resolution regardless of the source's own declared
  // viewBox size — some crests (mostly foreign Libertadores opponents)
  // declare a tiny viewBox like "0 0 80 80", and scanning at that native
  // size gave too few pixels to reliably find real content.
  const scanWidth = Math.max(vbW, 500);
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: scanWidth } });
  const { width, height, pixels } = resvg.render();
  const scale = vbW / width; // maps a detected raster pixel coordinate back to the source's own viewBox units.

  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { svg, aspectRatio: 1 }; // fully transparent art shouldn't happen in practice — render as-is rather than guess.

  const contentWpx = maxX - minX + 1;
  const contentHpx = maxY - minY + 1;
  const padPx = Math.round(Math.max(contentWpx, contentHpx) * 0.02);

  const cropX = Math.max(vbX, vbX + (minX - padPx) * scale);
  const cropY = Math.max(vbY, vbY + (minY - padPx) * scale);
  const cropMaxX = Math.min(vbX + vbW, vbX + (maxX + padPx) * scale);
  const cropMaxY = Math.min(vbY + vbH, vbY + (maxY + padPx) * scale);
  const cropW = cropMaxX - cropX;
  const cropH = cropMaxY - cropY;

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const newOpenTag = `<svg width="${round2(cropW)}" height="${round2(cropH)}" viewBox="${round2(cropX)} ${round2(cropY)} ${round2(cropW)} ${round2(cropH)}" xmlns="http://www.w3.org/2000/svg">`;
  const cropped = svg.toString("utf-8").replace(/<svg[^>]*>/, newOpenTag);
  return { svg: Buffer.from(cropped, "utf-8"), aspectRatio: cropW / cropH };
}
