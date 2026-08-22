import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  // libSQL's file: scheme works identically locally and against a real Turso
  // database — only the URL changes between environments. Local dev never
  // needs a Turso account; only a deployed environment does.
  DATABASE_URL: z.string().min(1).default("file:./data/ondevaipassar.db"),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  ADMIN_TOKEN: z.string().min(1).default("changeme"),
  // Vercel sets this automatically for cron-triggered requests
  // (Authorization: Bearer <CRON_SECRET>) — required in production so the
  // ingest endpoint can't be triggered by anyone who finds the URL.
  CRON_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);
