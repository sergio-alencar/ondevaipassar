import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { cropSvgToContent } from "../../lib/svgCrop.js";

// Only ge.globo's own crest CDN — the one real source this project hotlinks
// crests from for an untracked opponent (see TeamCrest.tsx's fallback
// cascade). Never fetch an arbitrary caller-supplied host: this route takes
// a URL as a query param and fetches it server-side, so without an
// allowlist it would be an open SSRF proxy.
const ALLOWED_HOST = "s.sde.globo.com";

const querySchema = z.object({ url: z.string().url() });

/** Exported for a direct unit test — this is the one thing standing between this route and being an open SSRF proxy, worth checking in isolation rather than only through the full route. */
export function isAllowedCrestUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && url.hostname === ALLOWED_HOST;
  } catch {
    return false;
  }
}

/**
 * Crops a hotlinked crest SVG the same way local crest art already is
 * (see lib/svgCrop.ts) before the site displays it. A *tracked* team's
 * crest is a local file we can crop once and keep (see the Instagram
 * assets.ts / packages/shared crop history) — an untracked opponent's
 * crest only exists as ge.globo's own URL, so cropping has to happen
 * per-request instead, on whatever the source actually serves.
 */
export async function crestProxyRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/crest-proxy", async (request, reply) => {
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: "invalid query params", details: parsedQuery.error.flatten() });
    }

    if (!isAllowedCrestUrl(parsedQuery.data.url)) {
      return reply.status(400).send({ error: `url must be an https:// URL on ${ALLOWED_HOST}` });
    }

    const upstream = await fetch(parsedQuery.data.url, { signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (!upstream || !upstream.ok) {
      return reply.status(502).send({ error: "failed to fetch upstream crest" });
    }

    const svg = Buffer.from(await upstream.arrayBuffer());
    const { svg: cropped } = cropSvgToContent(svg);

    // Crests essentially never change once published — cache aggressively
    // (at the CDN/edge and in the browser) rather than re-fetching and
    // re-cropping the same team's crest on every page view.
    return reply.type("image/svg+xml").header("Cache-Control", "public, max-age=604800, immutable").send(cropped);
  });
}
