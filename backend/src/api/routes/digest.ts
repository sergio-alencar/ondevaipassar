import { isTodayInBrasilia, isTomorrowInBrasilia } from "@ondevaipassar/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildDigest, buildThreadDigest } from "../../digest/digest.js";
import { getMatchViews } from "../../matches/getMatchViews.js";
import { startOfTodayInBrasiliaUtc } from "@ondevaipassar/shared";

const querySchema = z.object({
  // "x" is the 280-character version; "whatsapp" (the default) is the full
  // day's listing. Sérgio pastes both by hand — neither platform has a
  // posting API this project can use at $0/month (WhatsApp Channels have
  // none at all; X ended its free tier for new developers in Feb 2026).
  formato: z.enum(["whatsapp", "x"]).default("whatsapp"),
  // Lets him pull tomorrow's text the night before, same operator escape
  // hatch as instagramCron.ts's own matchId param.
  dia: z.enum(["hoje", "amanha"]).default("hoje"),
});

export async function digestRoutes(app: FastifyInstance): Promise<void> {
  // No auth, same reasoning as instagramPreview.ts: this is a rendering of
  // data /api/matches already serves publicly.
  app.get("/api/digest", async (request, reply) => {
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: "invalid query params", details: parsedQuery.error.flatten() });
    }
    const { formato, dia } = parsedQuery.data;

    const now = new Date();
    // Anchored on the start of today BRT rather than "now" (getMatchViews'
    // own default), so a match that already kicked off still shows up —
    // otherwise the digest silently empties out over the course of the day,
    // the same bug startOfTodayInBrasiliaUtc was introduced to fix for the
    // site's own "Jogos de Hoje" section.
    const allMatches = await getMatchViews({ from: startOfTodayInBrasiliaUtc(now) });
    const isTargetDay = dia === "amanha" ? isTomorrowInBrasilia : isTodayInBrasilia;
    const matches = allMatches.filter((match) => isTargetDay(match.kickoffUtc, now));

    const headerDate = dia === "amanha" ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : now;
    const day = dia === "amanha" ? "amanhã" : "hoje";
    // The X thread comes back as one plain-text document with a separator
    // between posts, not JSON: this is pasted by hand, one post at a time,
    // and a separator you can see beats having to parse anything.
    const text =
      formato === "x"
        ? buildThreadDigest(matches, headerDate, day).join(`\n\n${"─".repeat(20)}\n\n`)
        : buildDigest(matches, headerDate, day);

    return reply.type("text/plain; charset=utf-8").send(text);
  });
}
