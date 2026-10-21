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
 * Why bundle it ourselves: Vercel's own Node builder treats bare-specifier
 * imports resolved through node_modules — including our own workspace
 * packages (@nouveau/core, @nouveau/db, @nouveau/security), which have no
 * compiled output and whose package.json "main" points straight at
 * TypeScript source — as external rather than bundling them, which fails
 * at runtime with `Cannot find package '.../@nouveau/db/src/index.ts'`.
 * Bundling here ourselves, with only genuine third-party npm packages left
 * external (see the esbuild --external flags in package.json — including
 * `metaapi.cloud-sdk`/`metaapi.cloud-sdk/*`, which must stay external:
 * esbuild inlining that SDK's own internal webpack output breaks with
 * `Dynamic require of "util" is not supported`, found and fixed this
 * project), sidesteps the problem entirely.
 *
 * This must never call app.listen() (Vercel owns the HTTP listening) and
 * must never duplicate the adapter wiring buildApiApp() already
 * centralizes — server.ts uses the same helper so the two can't drift.
 */

const env = getEnv();
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
