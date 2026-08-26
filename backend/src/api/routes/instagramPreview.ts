import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { renderMatchImage } from "../../instagram/renderImage.js";
import { getMatchViews } from "../../matches/getMatchViews.js";

const querySchema = z.object({ matchId: z.string() });

// Instagram's Graph API fetches the post image from a public URL rather than
// accepting a direct upload — this route generates it on demand from live
// match data instead of writing to blob storage, avoiding new infra as long
// as the render stays fast and match data doesn't change mid-flow.
//
// matchId is a query param, not a :matchId path segment — Vercel's edge
// routing 404s on a raw ":" in a path segment (match ids look like
// "ge-globo:356257"; confirmed live against production that the same
// colon works fine in a query value but not in the path).
export async function instagramPreviewRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/instagram/preview", async (request, reply) => {
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: "invalid query params", details: parsedQuery.error.flatten() });
    }

    const [match] = await getMatchViews({ id: parsedQuery.data.matchId });
    if (!match) {
      return reply.status(404).send({ error: "match not found" });
    }

    const png = await renderMatchImage(match);
    return reply.type("image/png").send(png);
  });
}
