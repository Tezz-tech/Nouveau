import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { buildTestApp } from "../test/testApp";
import type { Express } from "express";

let ctx: Awaited<ReturnType<typeof buildTestApp>>;
let app: Express;

beforeAll(async () => {
  ctx = await buildTestApp();
  app = ctx.app;
});
afterAll(() => ctx.teardown());
beforeEach(() => ctx.clear());

async function signedUpAgent(email: string, accountType: "investor" | "trader" = "investor") {
  const agent = request.agent(app);
  await agent.post("/auth/signup").send({ email, password: "correcthorsebattery", accountType });
  return agent;
}

async function onboardedTrader(email: string) {
  const agent = await signedUpAgent(email, "trader");
  await agent
    .post("/onboarding/identity")
    .send({ fullName: "Jane Doe", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "P1234567" });
  await agent.post("/onboarding/broker-link").send({ broker: "TestBroker", login: "12345", serverName: "TestBroker-Live" });
  await agent.post("/onboarding/credentials").send({ mt5Password: "ReadOnlyPass123" });
  await agent.post("/onboarding/plan").send({ plan: "trader_monthly" });
  return agent;
}

describe("GET /signals/:base/:quote", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/signals/EUR/USD");
    expect(res.status).toBe(401);
  });

  it("rejects an investor — signals are trader-track only", async () => {
    const agent = await signedUpAgent("investor-signal@example.com", "investor");
    const res = await agent.get("/signals/EUR/USD");
    expect(res.status).toBe(403);
  });

  it("rejects a trader with no active subscription yet", async () => {
    const agent = await signedUpAgent("trader-no-sub@example.com", "trader");
    const res = await agent.get("/signals/EUR/USD");
    expect(res.status).toBe(402);
  });

  it("returns a signal for a fully onboarded, subscribed trader", async () => {
    const agent = await onboardedTrader("trader-signal@example.com");
    const res = await agent.get("/signals/EUR/USD");
    expect(res.status).toBe(200);
    expect(res.body.symbol).toBe("EUR/USD");
    expect(["buy", "sell", "hold"]).toContain(res.body.bias);
    expect(res.body.confidence).toBeGreaterThanOrEqual(0);
    expect(res.body.confidence).toBeLessThanOrEqual(1);
    expect(typeof res.body.narration).toBe("string");
    expect(res.body.narration.length).toBeGreaterThan(0);
    expect(typeof res.body.disclaimer).toBe("string");
    expect(res.body.disclaimer.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.priceSeries)).toBe(true);
    expect(res.body.priceSeries.length).toBeGreaterThan(0);
    expect(res.body.priceSeries[0]).toHaveProperty("day");
    expect(res.body.priceSeries[0]).toHaveProperty("price");
    expect(res.body.dataSource).toBe("simulator");
  });

  it("is deterministic for the same symbol (the simulator adapter, not randomness)", async () => {
    const agent = await onboardedTrader("trader-deterministic@example.com");
    const first = await agent.get("/signals/EUR/USD");
    const second = await agent.get("/signals/EUR/USD");
    expect(first.body.bias).toBe(second.body.bias);
    expect(first.body.confidence).toBe(second.body.confidence);
  });

  it("rejects a malformed symbol", async () => {
    const agent = await onboardedTrader("trader-bad-symbol@example.com");
    const res = await agent.get("/signals/eurusd/x");
    expect(res.status).toBe(400);
  });
});
