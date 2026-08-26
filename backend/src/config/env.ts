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
  // Long-lived Instagram Graph API token + the Business Account id it posts
  // as. Both unset in local dev — the poster runs in dry-run mode without
  // them (see INSTAGRAM_DRY_RUN below).
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().optional(),
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
});

export const env = envSchema.parse(process.env);
