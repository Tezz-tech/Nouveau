import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import rateLimit from "express-rate-limit";

/**
 * `authRateLimit`/`defaultRateLimit` themselves are configured to skip in
 * `NODE_ENV=test` (see rateLimit.ts) specifically so integration tests
 * don't trip over a shared app instance's accumulated request count. That
 * means those exports are never actually exercised by the rest of the
 * suite — this test builds an equivalent limiter directly, with
 * `NODE_ENV` temporarily not "test", to prove the underlying rate-limiting
 * behavior itself is correct.
 */
describe("rate limiting behavior (constructed directly, bypassing the test-env skip)", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("allows requests under the limit and rejects once the limit is exceeded", async () => {
    process.env.NODE_ENV = "production";
    const app = express();
    app.use(
      rateLimit({
        windowMs: 60_000,
        limit: 3,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Too many attempts. Try again later." },
      })
    );
    app.get("/ping", (_req, res) => res.status(200).json({ ok: true }));

    const agent = request.agent(app);
    const first = await agent.get("/ping");
    const second = await agent.get("/ping");
    const third = await agent.get("/ping");
    const fourth = await agent.get("/ping");

    expect([first.status, second.status, third.status]).toEqual([200, 200, 200]);
    expect(fourth.status).toBe(429);
    expect(fourth.body.error).toMatch(/too many/i);
  });
});
