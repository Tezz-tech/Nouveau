import { describe, it, expect, afterEach } from "vitest";
import { getEnv, resetEnvCache } from "./env";

/**
 * Regression coverage for a real incident: META_API_TOKEN/PAYSTACK_SECRET_KEY
 * were previously required unconditionally, so a deployment/local setup
 * without them failed to boot at all — taking down login, signup, and
 * every other unrelated route, not just the copy-trading-specific ones.
 * These must stay optional at the env-schema level; see
 * adapters/copyTrading/provider.ts and adapters/payment/provider.ts for
 * where the "no simulator" requirement is actually enforced instead.
 */
describe("env", () => {
  const originalToken = process.env.META_API_TOKEN;
  const originalKey = process.env.PAYSTACK_SECRET_KEY;

  afterEach(() => {
    if (originalToken === undefined) delete process.env.META_API_TOKEN;
    else process.env.META_API_TOKEN = originalToken;
    if (originalKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = originalKey;
    resetEnvCache();
  });

  it("parses successfully with META_API_TOKEN and PAYSTACK_SECRET_KEY both absent", () => {
    delete process.env.META_API_TOKEN;
    delete process.env.PAYSTACK_SECRET_KEY;
    resetEnvCache();
    expect(() => getEnv()).not.toThrow();
    const env = getEnv();
    expect(env.META_API_TOKEN).toBeUndefined();
    expect(env.PAYSTACK_SECRET_KEY).toBeUndefined();
  });

  it("still requires the genuinely always-required fields", () => {
    const savedSecret = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    resetEnvCache();
    expect(() => getEnv()).toThrow();
    process.env.SESSION_SECRET = savedSecret;
    resetEnvCache();
  });
});
