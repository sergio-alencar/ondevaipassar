import { env } from "../config/env.js";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

export interface GraphApiClient {
  createContainer(imageUrl: string, caption: string): Promise<string>;
  pollUntilFinished(containerId: string): Promise<void>;
  publishContainer(containerId: string): Promise<string>;
}

async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(url, init);
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Instagram Graph API error (HTTP ${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

/** Real implementation of the 3-step async publish flow: create a media container pointing at a public image URL, poll until Instagram finishes processing it, then publish it. */
export const realGraphApiClient: GraphApiClient = {
  async createContainer(imageUrl, caption) {
    const accountId = env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    const token = env.INSTAGRAM_ACCESS_TOKEN;
    if (!accountId || !token) throw new Error("INSTAGRAM_BUSINESS_ACCOUNT_ID/INSTAGRAM_ACCESS_TOKEN not configured");

    const params = new URLSearchParams({ image_url: imageUrl, caption, access_token: token });
    const body = await fetchJson(`${GRAPH_API_BASE}/${accountId}/media`, { method: "POST", body: params });
    const containerId = body.id;
    if (typeof containerId !== "string") throw new Error(`Unexpected container-creation response: ${JSON.stringify(body)}`);
    return containerId;
  },

  async pollUntilFinished(containerId) {
    const token = env.INSTAGRAM_ACCESS_TOKEN;
    if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN not configured");

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    for (;;) {
      const body = await fetchJson(`${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${token}`);
      if (body.status_code === "FINISHED") return;
      if (body.status_code === "ERROR") throw new Error(`Instagram failed to process the media container ${containerId}`);
      if (Date.now() > deadline) throw new Error(`Timed out waiting for media container ${containerId} to finish processing`);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  },

  async publishContainer(containerId) {
    const accountId = env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    const token = env.INSTAGRAM_ACCESS_TOKEN;
    if (!accountId || !token) throw new Error("INSTAGRAM_BUSINESS_ACCOUNT_ID/INSTAGRAM_ACCESS_TOKEN not configured");

    const params = new URLSearchParams({ creation_id: containerId, access_token: token });
    const body = await fetchJson(`${GRAPH_API_BASE}/${accountId}/media_publish`, { method: "POST", body: params });
    const mediaId = body.id;
    if (typeof mediaId !== "string") throw new Error(`Unexpected publish response: ${JSON.stringify(body)}`);
    return mediaId;
  },
};
