import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { broadcasts, scrapeRuns } from "../db/schema.js";
import { runBroadcastSource } from "./attachBroadcasts.js";

const SOURCE_ID = "channel-mirror";

/**
 * A broadcast confirmed for `from` should always also show `to` — a real
 * viewer-facing pairing, not a data-quality workaround: Sérgio asked for
 * this specifically because TNT Sports' own Champions League games stream
 * through the HBO Max app, so a viewer following either brand should see
 * both listed, regardless of which one whatever source (ge.globo's own
 * liveWatchSources, a supplementary scraper, ...) happened to confirm.
 */
const MIRRORS: { from: string; to: string }[] = [{ from: "tntsports", to: "hbomax" }];

/**
 * Runs last in the cron pass (after every other source), so it mirrors the
 * FINAL state of a run, not a partial one some earlier step might still
 * add to. Also cleans up a mirrored row whose source broadcast no longer
 * exists — same "upserts alone never delete" gap this project has already
 * hit twice this session (regionalDetail, watchUrl) for a different reason;
 * here the fix is a real delete, scoped to this source's own rows only.
 */
export async function runChannelMirroring(): Promise<void> {
  const startedAt = new Date().toISOString();

  await runBroadcastSource(SOURCE_ID, async () => {
    const now = new Date().toISOString();
    let mirroredCount = 0;
    let deletedCount = 0;
    const upserts = [];
    const deletes = [];

    for (const { from, to } of MIRRORS) {
      const sourceBroadcasts = await db.select().from(broadcasts).where(eq(broadcasts.channelId, from));
      const sourceMatchIds = new Set(sourceBroadcasts.map((b) => b.matchId));

      for (const source of sourceBroadcasts) {
        upserts.push(
          db
            .insert(broadcasts)
            .values({
              id: `${source.matchId}__${to}`,
              matchId: source.matchId,
              channelId: to,
              logoUrl: "",
              watchUrl: source.watchUrl,
              regionalDetail: source.regionalDetail,
              sourceId: SOURCE_ID,
              createdAt: now,
            })
            .onConflictDoUpdate({ target: broadcasts.id, set: { watchUrl: source.watchUrl, regionalDetail: source.regionalDetail } }),
        );
        mirroredCount++;
      }

      const existingMirrors = await db
        .select()
        .from(broadcasts)
        .where(and(eq(broadcasts.channelId, to), eq(broadcasts.sourceId, SOURCE_ID)));
      for (const mirror of existingMirrors) {
        if (!sourceMatchIds.has(mirror.matchId)) {
          deletes.push(db.delete(broadcasts).where(eq(broadcasts.id, mirror.id)));
          deletedCount++;
        }
      }
    }

    const allWrites = [...upserts, ...deletes];
    if (allWrites.length > 0) {
      const [first, ...rest] = allWrites;
      await db.batch([first, ...rest]);
    }

    await db.insert(scrapeRuns).values({
      sourceId: SOURCE_ID,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "ok",
      matchesFound: mirroredCount,
      matchesUnresolved: 0,
    });

    console.log(`[${SOURCE_ID}] mirrored ${mirroredCount} broadcasts, removed ${deletedCount} stale`);
  });
}
