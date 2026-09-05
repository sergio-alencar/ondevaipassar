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
  // The /digest page asks for this so it can give each thread post its own
  // copy button. Plain text stays the default: opening this route straight
  // in a browser is still a supported way to use it.
  json: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export async function digestRoutes(app: FastifyInstance): Promise<void> {
  // No auth, same reasoning as instagramPreview.ts: this is a rendering of
  // data /api/matches already serves publicly.
  app.get("/api/digest", async (request, reply) => {
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: "invalid query params", details: parsedQuery.error.flatten() });
    }
    const { formato, dia, json } = parsedQuery.data;

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
    // One post per entry for "x", a single entry for "whatsapp" — the page
    // renders one copy button per entry either way, so it doesn't need to
    // know which format it's showing.
    const posts = formato === "x" ? buildThreadDigest(matches, headerDate, day) : [buildDigest(matches, headerDate, day)];
    if (json) return { formato, dia, matchCount: matches.length, posts };

    // Plain text keeps a visible separator rather than JSON: opening this
    // route directly in a browser is a supported way to use it, and there a
    // separator you can see beats anything you'd have to parse.
    const text = posts.join(`\n\n${"─".repeat(20)}\n\n`);

    return reply.type("text/plain; charset=utf-8").send(text);
  });
}
