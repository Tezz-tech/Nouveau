import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 15000, // argon2 hashing is deliberately slow
  },
});
