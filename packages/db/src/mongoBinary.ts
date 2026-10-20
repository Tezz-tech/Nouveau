import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * `mongodb-memory-server` downloads a real ~590MB MongoDB binary on first
 * use and caches it under `~/.cache/mongodb-binaries`. If one is already
 * cached (from this project or any other on the machine), tests can use it
 * directly instead of triggering a fresh download — large downloads have
 * proven unreliable in this environment.
 *
 * Deliberately has NO import of `mongodb-memory-server` itself (a
 * devDependency) — this file is safe to export from the package's main
 * entry point without pulling a test-only dependency into anything that
 * consumes `@nouveau/db` in production. `testSetup.ts` (which does import
 * `mongodb-memory-server`) is the test-only consumer of this function.
 */
export function findCachedMongodBinary(): string | undefined {
  if (process.env.MONGOMS_SYSTEM_BINARY) return undefined; // respect an explicit override, don't fight it
  const cacheDir = join(homedir(), ".cache", "mongodb-binaries");
  if (!existsSync(cacheDir)) return undefined;
  const candidate = readdirSync(cacheDir).find((f) => /^mongod-.*\.exe$/.test(f) || f === "mongod");
  return candidate ? join(cacheDir, candidate) : undefined;
}
