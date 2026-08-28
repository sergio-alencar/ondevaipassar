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
// Rewrites width/height/viewBox *within* the original root tag rather than
// replacing the whole tag with a freshly-built one — every other attribute
// (fill, id, any xmlns:* namespace declarations) passes through completely
// untouched. An earlier version rebuilt the tag from scratch with a fixed
// small set of attributes, which broke real crests in two different, even
// contradictory ways: adding `fill="none"` (to match the unrelated
// channel-logo crop script) rendered Club Libertad's fully blank, because
// its paths get their color from a class in a <style> block that a root
// fill="none" overrides — but then *omitting* fill entirely rendered a new
// solid-black outline on Fluminense's, because it has a path with no fill
// of its own that depends on inheriting the root's original fill="none" to
// stay invisible (SVG's fill initial value is black, not none). Dropping
// other namespaces the same way separately broke two more crests that
// declare xmlns:rdf for embedded Illustrator/RDF metadata deeper in the
// file — resvg refused to parse the rewritten tag's now-undeclared `rdf:`
// prefix. Editing attributes in place, leaving unrelated ones alone, is
// the one approach that doesn't keep re-breaking some other real file.
export function cropSvgToContent(svg: Buffer): { svg: Buffer; aspectRatio: number } {
  const text = svg.toString("utf-8");
  const openTagMatch = text.match(/<svg[^>]*viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"[^>]*>/);
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
  const originalTag = openTagMatch[0];
  const newViewBox = `viewBox="${round2(cropX)} ${round2(cropY)} ${round2(cropW)} ${round2(cropH)}"`;
  let newTag = originalTag.replace(/viewBox="[^"]*"/, newViewBox);
  // width/height are presentational (CSS pixel size when embedded with no
  // other sizing), not part of the coordinate system the way viewBox is —
  // updating them keeps the file's own declared aspect ratio consistent
  // with its new viewBox, but only if the original tag actually had them.
  if (/ width="[^"]*"/.test(newTag)) newTag = newTag.replace(/ width="[^"]*"/, ` width="${round2(cropW)}"`);
  if (/ height="[^"]*"/.test(newTag)) newTag = newTag.replace(/ height="[^"]*"/, ` height="${round2(cropH)}"`);
  const cropped = text.replace(originalTag, newTag);
  return { svg: Buffer.from(cropped, "utf-8"), aspectRatio: cropW / cropH };
}
