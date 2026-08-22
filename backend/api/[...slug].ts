import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/api/app.js";

// Cached across warm invocations of the same function instance — buildApp()
// (schema + registry seed) shouldn't re-run on every request when Vercel
// reuses a warm instance, only on a fresh cold start.
let appPromise: Promise<FastifyInstance> | null = null;

async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) appPromise = buildApp();
  const app = await appPromise;
  await app.ready();
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const app = await getApp();
  app.server.emit("request", req, res);
}
