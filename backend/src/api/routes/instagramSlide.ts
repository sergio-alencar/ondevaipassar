import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { renderCoverImage, renderSlideImage } from "../../instagram/renderCarousel.js";
import { getMatchViews } from "../../matches/getMatchViews.js";

const querySchema = z.object({
  /** Competition.id, or "europa" for the combined European post — picks the cover logo and the header name. */
  competitionId: z.string().min(1),
  /** The matches on this image, comma-separated, in the order the poster grouped them. */
  matchIds: z.string().min(1),
  kind: z.enum(["cover", "slide"]),
  /** "2/3" in the slide's corner; omitted when the competition fits one slide. */
  slideLabel: z.string().optional(),
  /** Whether to name each match's own competition — true only for the mixed European post. */
  mixed: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

/**
 * The image Instagram fetches for one carousel slide. Same "generate on
 * demand from live data, no blob storage" approach as
 * /api/instagram-preview (see its own comment, including why this is one
 * path segment) — but a slide carries SEVERAL matches, so which ones is
 * passed in explicitly rather than re-derived here.
 *
 * That matters: the poster decides the grouping, and if this route worked
 * it out again from "today's matches", an ingest landing between the two
 * reads would hand Instagram a different slide than the one the caption
 * describes.
 */
export async function instagramSlideRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/instagram-slide", async (request, reply) => {
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: "invalid query params", details: parsedQuery.error.flatten() });
    }
    const { competitionId, matchIds, kind, slideLabel, mixed } = parsedQuery.data;

    const matches = await getMatchViews({ ids: matchIds.split(",") });
    if (matches.length === 0) {
      return reply.status(404).send({ error: "no matches found for the given ids" });
    }

    const png =
      kind === "cover"
        ? await renderCoverImage(competitionId, matches)
        : await renderSlideImage(competitionId, matches, slideLabel ?? null, mixed);
    return reply.type("image/png").send(png);
  });
}
