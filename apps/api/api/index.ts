import type { IncomingMessage, ServerResponse } from "node:http";
import { connectToDatabase } from "@nouveau/db";
import { getEnv } from "../src/config/env";
import { buildApiApp } from "../src/buildApiApp";

/**
 * Vercel's serverless-function convention: a file under api/ exporting a
 * default (req, res) handler. This exists as a THIN wrapper around the same
 * Express app server.ts uses — it must never call app.listen() (Vercel
 * owns the HTTP listening) and must never duplicate the adapter wiring
 * that buildApiApp() already centralizes.
 *
 * Root cause this file fixes: without it, Vercel's zero-config Node
 * handling was transpiling apps/api's TypeScript source file-by-file
 * without bundling, so Node's ESM loader failed on this repo's
 * extensionless relative imports (`./config/env`) at runtime — a crash
 * that only appears once actually deployed, not in local dev (tsx) or
 * `tsc --noEmit`. A file under api/ is bundled by Vercel's own
 * esbuild-based Node builder, which resolves those imports correctly.
 */

const env = getEnv();

if (env.TRADING_MODE === "live") {
  throw new Error(
    "TRADING_MODE=live is not permitted yet — no broker adapter, no strategy engine, no kill switch exist. This is expected to fail until Phase 5+."
  );
}

const app = buildApiApp();

// Vercel reuses a warm function instance across invocations, so the
// connection promise is cached at module scope rather than reconnecting
// (and racing) on every request.
let dbReady: ReturnType<typeof connectToDatabase> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  dbReady ??= connectToDatabase(env.MONGODB_URI);
  await dbReady;
  app(req, res);
}
