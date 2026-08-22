import { fetchText } from "../../http/client.js";
import { extractBalancedJsonObject } from "../../http/json.js";

// hl/gl ask YouTube for the Brazilian-Portuguese rendering, but that's a
// nice-to-have, not load-bearing: see schema.ts for why the page's own
// displayed time is never trusted regardless of locale.
const STREAMS_URL = "https://www.youtube.com/@CazeTV/streams?hl=pt&gl=BR";
const MARKER = "var ytInitialData = ";

/**
 * Same trick as ge.globo's scheduleTeam: YouTube server-renders a big JSON
 * blob into the page for its own client-side hydration. Not a published
 * API — confirmed present in a live fetch on 2026-08-22, but this is the
 * *third* internal schema YouTube has used for channel grid items over the
 * years (videoRenderer, then gridVideoRenderer, now the lockupViewModel
 * shape schema.ts validates against), so it can change without notice.
 * Split from the fetch below (same split as ge-globo's extractScheduleTeam)
 * so this half can be tested against a saved fixture, no network needed.
 */
export function extractYtInitialData(html: string): unknown {
  const markerIndex = html.indexOf(MARKER);
  if (markerIndex === -1) {
    throw new Error(`"${MARKER}" not found — YouTube's page structure may have changed`);
  }
  const openBraceIndex = markerIndex + MARKER.length;
  return JSON.parse(extractBalancedJsonObject(html, openBraceIndex));
}

export async function fetchCazeTvPageData(): Promise<unknown> {
  const html = await fetchText(STREAMS_URL);
  return extractYtInitialData(html);
}

/**
 * ytInitialData has no documented schema and nests unpredictably deep, so
 * instead of describing its whole shape we walk the entire tree collecting
 * every value found under the given key — e.g. every "lockupViewModel" (one
 * per video tile on the Streams tab) or the channel's single
 * "avatarViewModel". Each hit is validated on its own by the caller
 * (schema.ts) rather than trusting this walk found the right thing.
 */
export function findAllByKey(value: unknown, key: string, results: unknown[] = []): unknown[] {
  if (Array.isArray(value)) {
    for (const item of value) findAllByKey(item, key, results);
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === key) results.push(v);
      findAllByKey(v, key, results);
    }
  }
  return results;
}
