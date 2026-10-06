import { afterEach, describe, expect, it, vi } from "vitest";
import { crestArt } from "../src/instagram/assets.js";

const CREST_URL = "https://s.sde.globo.com/media/organizations/x.svg";

function stubCrestFetch(svg: string): void {
  const body = Buffer.from(svg);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/svg+xml" }),
      arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    }),
  );
}

/** The gray shield every failure path lands on — what a "the crest didn't show up" bug actually looks like. */
async function genericShield(): Promise<string> {
  return (await crestArt(null, null)).dataUri;
}

/**
 * The viewBox the pipeline ended up with. Compared instead of the whole data
 * URI because the source's own attribute order survives into the output, so
 * two SVGs that are handled identically still differ byte for byte.
 */
function viewBoxOf(dataUri: string): string {
  const svg = Buffer.from(dataUri.replace("data:image/svg+xml;base64,", ""), "base64").toString("utf-8");
  return svg.match(/viewBox="([^"]+)"/)?.[1] ?? "";
}

describe("crestArt: synthesizing a viewBox for a hotlinked crest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Real bug, live on the 12/09 post: Sunderland's crest came out as the
  // generic shield. Its SVG from ge.globo is Inkscape output, which writes
  // `height` before `width`, and the single pattern that read both demanded
  // width first — so no viewBox was synthesized and the real badge was
  // dropped. Asserting against the fallback rather than "it rendered", which
  // is true either way and is why this went unnoticed.
  it("reads width and height in either order — Inkscape writes height first", async () => {
    const fallback = await genericShield();

    stubCrestFetch('<svg xmlns="http://www.w3.org/2000/svg" height="250" width="300"><circle cx="150" cy="125" r="100"/></svg>');
    const heightFirst = await crestArt(null, CREST_URL);

    stubCrestFetch('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="250"><circle cx="150" cy="125" r="100"/></svg>');
    const widthFirst = await crestArt(null, CREST_URL);

    expect(heightFirst.dataUri).not.toBe(fallback);
    expect(viewBoxOf(heightFirst.dataUri)).toBe(viewBoxOf(widthFirst.dataUri));
  });

  it("ignores a nested element's own width/height, reading only the root <svg> tag", async () => {
    stubCrestFetch(
      '<svg xmlns="http://www.w3.org/2000/svg" height="250" width="300"><rect width="10" height="10" x="0" y="0"/><circle cx="150" cy="125" r="100"/></svg>',
    );
    const art = await crestArt(null, CREST_URL);
    expect(art.dataUri).not.toBe(await genericShield());
    // Read from the <rect>, the root viewBox would be 10x10 and everything
    // but that corner would fall outside it. The circle alone is 200 wide.
    const [, , width] = viewBoxOf(art.dataUri).split(" ").map(Number);
    expect(width).toBeGreaterThan(100);
  });

  it("still falls back to the shield when there is no viewBox and no width/height to build one from", async () => {
    stubCrestFetch('<svg xmlns="http://www.w3.org/2000/svg"><circle cx="400" cy="400" r="300"/></svg>');
    expect((await crestArt(null, CREST_URL)).dataUri).toBe(await genericShield());
  });
});
