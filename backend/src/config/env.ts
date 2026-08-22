import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_PATH: z.string().min(1).default("./data/ondevaipassar.sqlite"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  ADMIN_TOKEN: z.string().min(1).default("changeme"),
});

export const env = envSchema.parse(process.env);
