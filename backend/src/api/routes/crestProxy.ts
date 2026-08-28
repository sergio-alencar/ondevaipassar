import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { cropSvgToContent } from "../../lib/svgCrop.js";

// Every host this project hotlinks a crest from for an untracked opponent
// (see TeamCrest.tsx's fallback cascade) — ge.globo's own CDN plus
// OneFootball's (added for the "Europa" fixture source: an opponent Series
// C/onefootball.com-only match involves, e.g. Schalke 04 in a Bayern de
// Munique fixture, is never one of our own tracked teams, so its crest only
// ever exists as OneFootball's own hotlinked URL). Never fetch an arbitrary
// caller-supplied host: this route takes a URL as a query param and fetches
// it server-side, so without an allowlist it would be an open SSRF proxy.
const ALLOWED_HOSTS = new Set(["s.sde.globo.com", "images.onefootball.com"]);

const querySchema = z.object({ url: z.string().url() });

/** Exported for a direct unit test — this is the one thing standing between this route and being an open SSRF proxy, worth checking in isolation rather than only through the full route. */
export function isAllowedCrestUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Crops a hotlinked crest SVG the same way local crest art already is
 * (see lib/svgCrop.ts) before the site displays it. A *tracked* team's
 * crest is a local file we can crop once and keep (see the Instagram
 * assets.ts / packages/shared crop history) — an untracked opponent's
 * crest only exists as the source's own URL, so cropping has to happen
 * per-request instead, on whatever the source actually serves.
 *
 * Not every allowed source serves SVG: OneFootball's own crests are PNG
 * (confirmed live — a real bug this fixed, found via a broken Schalke 04
 * crest on a Bayern de Munique match: cropSvgToContent's own viewBox regex
 * simply doesn't match non-SVG bytes, so it silently fell through to its
 * "no viewBox found, render as-is" path — but this route then still
 * force-labeled that raw PNG buffer `image/svg+xml`, which no browser
 * renders as an image). Cropping only makes sense for SVG's own
 * rewrite-the-viewBox technique in the first place, so a raster crest is
 * just passed through untouched, labeled with its own real content-type.
 */
export async function crestProxyRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/crest-proxy", async (request, reply) => {
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: "invalid query params", details: parsedQuery.error.flatten() });
    }

    if (!isAllowedCrestUrl(parsedQuery.data.url)) {
      return reply.status(400).send({ error: `url must be an https:// URL on one of: ${[...ALLOWED_HOSTS].join(", ")}` });
    }

    const upstream = await fetch(parsedQuery.data.url, { signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (!upstream || !upstream.ok) {
      return reply.status(502).send({ error: "failed to fetch upstream crest" });
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    const body = Buffer.from(await upstream.arrayBuffer());

    // Crests essentially never change once published — cache aggressively
    // (at the CDN/edge and in the browser) rather than re-fetching and
    // re-cropping the same team's crest on every page view.
    const cacheHeader = { "Cache-Control": "public, max-age=604800, immutable" };

    if (!contentType.includes("svg")) {
      return reply.type(contentType || "application/octet-stream").headers(cacheHeader).send(body);
    }

    const { svg: cropped } = cropSvgToContent(body);
    return reply.type("image/svg+xml").headers(cacheHeader).send(cropped);
  });
}
