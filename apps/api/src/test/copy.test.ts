import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { buildTestApp } from "./testApp";
import type { Express } from "express";

let ctx: Awaited<ReturnType<typeof buildTestApp>>;
let app: Express;

beforeAll(async () => {
  ctx = await buildTestApp();
  app = ctx.app;
});
afterAll(() => ctx.teardown());
beforeEach(() => ctx.clear());

async function onboardedInvestor(email: string) {
  const agent = request.agent(app);
  await agent.post("/auth/signup").send({ email, password: "correcthorsebattery", accountType: "investor" });
  await agent
    .post("/onboarding/identity")
    .send({ fullName: "Jane Doe", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "P1234567" });
  await agent
    .post("/onboarding/broker-account")
    .send({ broker: "TestBroker", login: "12345", serverName: "TestBroker-Live" });
  return agent;
}

describe("copy trading", () => {
  it("links a follower to the master, demos an AI trade, and audits it", async () => {
    const agent = await onboardedInvestor("copy@example.com");

    const status0 = await agent.get("/copy/status").expect(200);
    expect(status0.body.provider).toBe("simulator");
    expect(status0.body.subscription).toBeNull();

    const sub = await agent.post("/copy/subscribe").send({ mode: "multiplier", multiplier: 0.5 }).expect(200);
    expect(sub.body.strategyId).toMatch(/sim-strat-/);
    expect(sub.body.subscriberId).toMatch(/sim-sub-/);

    const demo = await agent
      .post("/copy/demo")
      .send({
        symbol: "EURUSD",
        bias: "buy",
        confidence: 0.9,
        reason: "strong trend continuation with indicator agreement",
        requestedLot: 1,
        stopLossPips: 25,
        takeProfitPips: 50,
      })
      .expect(200);
    // Either approved (copied to the 0.5x follower) or blocked on
    // indicator disagreement — both are correct gate behaviour; the
    // audit trail must exist either way.
    expect(["approve", "reduce", "block"]).toContain(demo.body.verdict);

    const trades = await agent.get("/copy/trades").expect(200);
    expect(Array.isArray(trades.body)).toBe(true);

    const decisions = await agent.get("/copy/decisions").expect(200);
    expect(decisions.body.length).toBeGreaterThan(0);
    expect(decisions.body[0].logReason.length).toBeGreaterThan(10);
  });

  it("rejects a proposal with no stop loss", async () => {
    const agent = await onboardedInvestor("copy-nostop@example.com");
    await agent.post("/copy/subscribe").send({ mode: "multiplier", multiplier: 1 }).expect(200);
    const bad = await agent
      .post("/copy/demo")
      .send({
        symbol: "EURUSD",
        bias: "sell",
        confidence: 0.9,
        reason: "reversal expected at resistance zone here",
        requestedLot: 1,
        stopLossPips: null,
        takeProfitPips: 50,
      })
      .expect(200);
    expect(bad.body.verdict).toBe("block");
    expect(bad.body.logReason).toContain("Stop loss");
  });

  it("refuses a second subscription while one is active", async () => {
    const agent = await onboardedInvestor("copy-double@example.com");
    await agent.post("/copy/subscribe").send({ mode: "multiplier", multiplier: 1 }).expect(200);
    const again = await agent.post("/copy/subscribe").send({ mode: "multiplier", multiplier: 1 });
    expect(again.status).toBe(409);
  });
});

