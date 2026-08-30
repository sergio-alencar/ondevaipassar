import { env } from "../config/env.js";

// "Instagram API with Instagram Login" — the newer of Meta's two content
// publishing flows, live on graph.instagram.com. Doesn't need a linked
// Facebook Page at all (unlike the older graph.facebook.com flow this was
// originally written against): the account authorizes the app directly,
// and the dashboard hands out an already-long-lived (60-day) token.
const GRAPH_API_BASE = "https://graph.instagram.com/v25.0";
// Meta's own guidance says "once per minute, for no more than 5 minutes" —
// but a full 60s sleep between checks, done sequentially for every match in
// one Vercel function invocation, is what actually caused a real production
// bug: Sérgio reported only 7 of 15 tracked matches getting posted one day.
// A single container needing even one extra poll cycle could burn the
// function's entire time budget on its own, and Vercel kills the whole
// invocation mid-flight with no chance to record an error for anything
// after it. Polling a lightweight status read every few seconds instead
// (this is a read, not a write — Meta's real rate-limit concern is
// hammering write endpoints, not this) keeps each match's total posting
// time from dominating the run. POLL_TIMEOUT_MS (the real safety ceiling)
// is unchanged.
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60000;

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
    const accountId = env.INSTAGRAM_USER_ID;
    const token = env.INSTAGRAM_ACCESS_TOKEN;
    if (!accountId || !token) throw new Error("INSTAGRAM_USER_ID/INSTAGRAM_ACCESS_TOKEN not configured");

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
      // FINISHED means ready to publish; PUBLISHED shouldn't occur here
      // (we only poll before calling media_publish) but is harmless to
      // treat as "go ahead" if it does.
      if (body.status_code === "FINISHED" || body.status_code === "PUBLISHED") return;
      if (body.status_code === "ERROR" || body.status_code === "EXPIRED") {
        throw new Error(`Instagram failed to process the media container ${containerId} (status: ${body.status_code})`);
      }
      if (Date.now() > deadline) throw new Error(`Timed out waiting for media container ${containerId} to finish processing`);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  },

  async publishContainer(containerId) {
    const accountId = env.INSTAGRAM_USER_ID;
    const token = env.INSTAGRAM_ACCESS_TOKEN;
    if (!accountId || !token) throw new Error("INSTAGRAM_USER_ID/INSTAGRAM_ACCESS_TOKEN not configured");

    const params = new URLSearchParams({ creation_id: containerId, access_token: token });
    const body = await fetchJson(`${GRAPH_API_BASE}/${accountId}/media_publish`, { method: "POST", body: params });
    const mediaId = body.id;
    if (typeof mediaId !== "string") throw new Error(`Unexpected publish response: ${JSON.stringify(body)}`);
    return mediaId;
  },
};
