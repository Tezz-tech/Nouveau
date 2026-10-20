import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 600000, // first run downloads a ~590MB MongoDB binary; cached after that
    fileParallelism: false, // one shared in-memory MongoDB instance across test files
  },
});
