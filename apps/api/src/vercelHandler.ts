import type { IncomingMessage, ServerResponse } from "node:http";
import { connectToDatabase } from "@nouveau/db";
import { getEnv } from "./config/env";
import { buildApiApp } from "./buildApiApp";

/**
 * Source for Vercel's serverless-function entrypoint. This file itself is
 * NOT what gets deployed — the "vercel-build" script in package.json
 * bundles it (via esbuild) into api/index.js, which is what Vercel's
 * serverless-function convention (a file under api/) actually picks up.
 *
 * Why bundle it ourselves instead of letting Vercel's own Node builder
 * handle api/*.ts directly: that builder treats bare-specifier imports
 * resolved through node_modules — including our own workspace packages
 * (@nouveau/core, @nouveau/db, @nouveau/security) — as external rather
 * than bundling them. Those packages have no compiled output; their
 * package.json "main" points straight at TypeScript source
 * (./src/index.ts), which a plain Node process can't load. That surfaces
 * at runtime, in production, as `Cannot find package
 * '.../node_modules/@nouveau/db/src/index.ts'` — invisible locally since
 * dev (tsx) and tests resolve workspace packages differently. Bundling
 * here ourselves, with only genuine third-party npm packages (express,
 * mongoose, argon2, etc. — see the esbuild --external flags in
 * package.json) left external, inlines the workspace packages' compiled
 * code directly into the one deployed file, sidestepping the problem
 * entirely rather than requiring every workspace package to also get its
 * own separate build step and compiled dist/ output.
 *
 * This must never call app.listen() (Vercel owns the HTTP listening) and
 * must never duplicate the adapter wiring buildApiApp() already
 * centralizes — server.ts (the traditional-host entrypoint) uses the same
 * helper so the two can't drift.
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
