import type { FastifyInstance } from "fastify";
import { renderMatchImage } from "../../instagram/renderImage.js";
import { getMatchViews } from "../../matches/getMatchViews.js";

// Instagram's Graph API fetches the post image from a public URL rather than
// accepting a direct upload — this route generates it on demand from live
// match data instead of writing to blob storage, avoiding new infra as long
// as the render stays fast and match data doesn't change mid-flow.
export async function instagramPreviewRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { matchId: string } }>("/api/instagram/preview/:matchId", async (request, reply) => {
    const [match] = await getMatchViews({ id: request.params.matchId });
    if (!match) {
      return reply.status(404).send({ error: "match not found" });
    }

    const png = await renderMatchImage(match);
    return reply.type("image/png").send(png);
  });
}
