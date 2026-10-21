import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 600000, // shares the mongodb-memory-server binary cache with @nouveau/db
    fileParallelism: false,
    setupFiles: ["./src/test/setupEnv.ts"],
  },
});
