import type { MatchView } from "@ondevaipassar/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderMatchImage } from "../src/instagram/renderImage.js";

function buildMatch(overrides: Partial<MatchView> = {}): MatchView {
  return {
    id: "match-1",
    competitionId: "brasileirao-a",
    competitionName: "Campeonato Brasileiro Série A",
    homeTeamId: "cruzeiro",
    homeTeamName: "Cruzeiro",
    homeTeamCrestUrl: "https://example.com/cruzeiro.png",
    awayTeamId: "atletico_mineiro",
    awayTeamName: "Atlético-MG",
    awayTeamCrestUrl: "https://example.com/atletico.png",
    kickoffUtc: "2026-08-25T19:00:00.000Z",
    kickoffTimeConfirmed: true,
    round: 20,
    status: "scheduled",
    broadcasts: [{ channelId: "globo", displayName: "Globo", url: "https://globo.com", logoUrl: "", regionalCaveat: true }],
    ...overrides,
  };
}

function isPng(buffer: Buffer): boolean {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return buffer.subarray(0, 8).equals(PNG_SIGNATURE);
}

const SVG_CREST = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>');

describe("renderMatchImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Real bug found live: Elversberg/Hamburgo/Paraná (untracked opponents,
  // no local crest file) rendered with the generic gray shield in every
  // Instagram post — assets.ts's crestArt never tried the source's own
  // hotlinked crest URL the way the frontend's TeamCrest does. Confirms
  // the fetch actually happens and its result reaches the render, not just
  // that the render doesn't throw.
  it("fetches the source's own hotlinked crest for an untracked opponent on an allowed host", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/svg+xml" }),
      arrayBuffer: async () => SVG_CREST.buffer.slice(SVG_CREST.byteOffset, SVG_CREST.byteOffset + SVG_CREST.byteLength),
    });
    vi.stubGlobal("fetch", fetchMock);

    const png = await renderMatchImage(
      buildMatch({ awayTeamId: null, awayTeamName: "Visitante", awayTeamCrestUrl: "https://s.sde.globo.com/media/organizations/x.svg" }),
    );

    expect(fetchMock).toHaveBeenCalledWith("https://s.sde.globo.com/media/organizations/x.svg", expect.anything());
    expect(isPng(png)).toBe(true);
  });

  // Real bug found live (Elversberg's own real crest, confirmed by
  // fetching it directly): no viewBox, only "width="800px" height="800px"
  // — crashed Satori entirely ("Failed to parse SVG ... missing
  // viewBox"), taking the whole post down, not just that crest. Fixed by
  // synthesizing a viewBox from the width/height already given, rather
  // than settling for the generic shield when the real dimensions are
  // right there.
  it("synthesizes a viewBox from width/height for a hotlinked SVG that has none, instead of crashing or falling back", async () => {
    const noViewBoxSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800px" height="800px"><circle cx="400" cy="400" r="300"/></svg>');
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "image/svg+xml" }),
        arrayBuffer: async () => noViewBoxSvg.buffer.slice(noViewBoxSvg.byteOffset, noViewBoxSvg.byteOffset + noViewBoxSvg.byteLength),
      }),
    );

    const png = await renderMatchImage(
      buildMatch({ awayTeamId: null, awayTeamName: "Visitante", awayTeamCrestUrl: "https://s.sde.globo.com/media/organizations/x.svg" }),
    );

    expect(isPng(png)).toBe(true);
  });

  it("falls back to the generic shield for a hotlinked SVG with neither a viewBox nor width/height to synthesize one from", async () => {
    const bareSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle cx="400" cy="400" r="300"/></svg>');
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "image/svg+xml" }),
        arrayBuffer: async () => bareSvg.buffer.slice(bareSvg.byteOffset, bareSvg.byteOffset + bareSvg.byteLength),
      }),
    );

    const png = await renderMatchImage(
      buildMatch({ awayTeamId: null, awayTeamName: "Visitante", awayTeamCrestUrl: "https://s.sde.globo.com/media/organizations/x.svg" }),
    );

    expect(isPng(png)).toBe(true);
  });

  it("falls back to the generic shield when the hotlinked crest fetch fails, without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0) }),
    );

    const png = await renderMatchImage(
      buildMatch({ awayTeamId: null, awayTeamName: "Visitante", awayTeamCrestUrl: "https://s.sde.globo.com/media/organizations/x.svg" }),
    );

    expect(isPng(png)).toBe(true);
  });

  // Real bug found live, same day as the hotlink one above but a
  // different code path: Maranhão's own LOCAL crest file (one of 6
  // shipped without a viewBox — see assets.ts's own loadCrestArt comment)
  // crashed Satori the exact same way, since crestArt's local-file branch
  // never went through the hotlink-only fix at first. No mocking needed —
  // exercises the real fixture file already in the repo.
  it("renders a valid PNG for a tracked team whose local crest file has no viewBox (Maranhão)", async () => {
    const png = await renderMatchImage(buildMatch({ homeTeamId: "maranhao", homeTeamName: "Maranhão" }));
    expect(isPng(png)).toBe(true);
  });

  it("renders a valid, non-empty PNG for a match with local crest art on both sides", async () => {
    const png = await renderMatchImage(buildMatch());
    expect(isPng(png)).toBe(true);
    expect(png.length).toBeGreaterThan(1000);
  });

  it("falls back to the generic shield for a team with no local crest art", async () => {
    const png = await renderMatchImage(buildMatch({ homeTeamId: "a-team-with-no-local-art" }));
    expect(isPng(png)).toBe(true);
  });

  it("falls back to the generic shield for an untracked opponent (null team id)", async () => {
    const png = await renderMatchImage(buildMatch({ awayTeamId: null, awayTeamName: "Visitante" }));
    expect(isPng(png)).toBe(true);
  });

  it("handles many broadcasts wrapping to multiple rows", async () => {
    const png = await renderMatchImage(
      buildMatch({
        broadcasts: [
          { channelId: "globo", displayName: "Globo", url: "", logoUrl: "", regionalCaveat: true },
          { channelId: "premiere", displayName: "Premiere", url: "", logoUrl: "", regionalCaveat: false },
          { channelId: "getv", displayName: "ge TV", url: "", logoUrl: "", regionalCaveat: false },
          { channelId: "sportv", displayName: "SporTV", url: "", logoUrl: "", regionalCaveat: false },
          { channelId: "tntsports", displayName: "TNT Sports", url: "", logoUrl: "", regionalCaveat: false },
        ],
      }),
    );
    expect(isPng(png)).toBe(true);
  });

  it("handles a long team name without throwing", async () => {
    const png = await renderMatchImage(buildMatch({ awayTeamName: "Grêmio Foot-Ball Porto Alegrense" }));
    expect(isPng(png)).toBe(true);
  });
});
