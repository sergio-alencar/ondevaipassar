import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  // libSQL's file: scheme works identically locally and against a real Turso
  // database — only the URL changes between environments. Local dev never
  // needs a Turso account; only a deployed environment does.
  DATABASE_URL: z.string().min(1).default("file:./data/ondevaipassar.db"),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  // Vercel sets this automatically for cron-triggered requests
  // (Authorization: Bearer <CRON_SECRET>) — required in production so the
  // ingest and instagram-post endpoints can't be triggered by anyone who
  // finds the URL.
  CRON_SECRET: z.string().optional(),
  // "Instagram API with Instagram Login" (graph.instagram.com) — the app
  // dashboard hands out an already-long-lived (60-day) token directly, no
  // exchange step needed. INSTAGRAM_USER_ID is the account's own numeric id
  // (IG_ID), read via GET https://graph.instagram.com/v25.0/me?fields=user_id
  // with that same token. Both unset in local dev — the poster runs in
  // dry-run mode without them (see INSTAGRAM_DRY_RUN below).
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_USER_ID: z.string().optional(),
  // Public origin of this backend deployment — needed to build the image
  // URL Instagram's servers fetch from when creating a media container.
  PUBLIC_BASE_URL: z.string().optional(),
  // When true, the Instagram poster runs its full pipeline (match
  // selection, image render, caption) but logs instead of calling the real
  // Graph API or writing a "published" row — safe to run locally or against
  // real data without ever posting for real.
  INSTAGRAM_DRY_RUN: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  // YouTube Data API v3 key (console.cloud.google.com, "YouTube Data API v3"
  // enabled, no OAuth needed — all reads here are public data). Used to find
  // upcoming/scheduled livestreams on tracked broadcasters' channels; see
  // ingest/youtubeEnrichment.ts. Unset locally just means that enrichment
  // step is skipped, same "degrade gracefully" pattern as the other optional
  // integrations above.
  YOUTUBE_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
