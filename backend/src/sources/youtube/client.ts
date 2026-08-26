import { channelResponseSchema, searchResponseSchema, videosResponseSchema } from "./schema.js";

const API_BASE = "https://www.googleapis.com/youtube/v3";

async function getJson(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube Data API error (HTTP ${response.status}) on ${path}: ${await response.text()}`);
  }
  return response.json();
}

export interface UpcomingVideo {
  videoId: string;
  title: string;
}

/** Every video currently flagged "upcoming" (scheduled, not yet live) on a channel — this is the whole reason to use the real API over scraping: eventType=upcoming is exactly "scheduled livestream, not started," no title/text heuristics needed to figure that part out. */
export async function searchUpcomingVideos(youtubeChannelId: string, apiKey: string): Promise<UpcomingVideo[]> {
  const raw = await getJson("search", {
    part: "snippet",
    channelId: youtubeChannelId,
    eventType: "upcoming",
    type: "video",
    maxResults: "25",
    key: apiKey,
  });
  const parsed = searchResponseSchema.parse(raw);
  return parsed.items.map((item) => ({ videoId: item.id.videoId, title: item.snippet.title }));
}

/** scheduledStartTime is only on the `videos` resource, not `search` results — one batched call (comma-joined ids, max 50 per YouTube's own limit) instead of one call per video. */
export async function fetchScheduledStartTimes(videoIds: string[], apiKey: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (videoIds.length === 0) return result;

  const raw = await getJson("videos", { part: "liveStreamingDetails", id: videoIds.join(","), key: apiKey });
  const parsed = videosResponseSchema.parse(raw);
  for (const item of parsed.items) {
    if (item.liveStreamingDetails) result.set(item.id, item.liveStreamingDetails.scheduledStartTime);
  }
  return result;
}

/** Channel avatar, used as the broadcast's logoUrl fallback if we don't ship local art for a channel (see packages/shared's Channel type doc). */
export async function fetchChannelAvatarUrl(youtubeChannelId: string, apiKey: string): Promise<string | null> {
  const raw = await getJson("channels", { part: "snippet", id: youtubeChannelId, key: apiKey });
  const parsed = channelResponseSchema.parse(raw);
  return parsed.items[0]?.snippet.thumbnails.high.url ?? null;
}
