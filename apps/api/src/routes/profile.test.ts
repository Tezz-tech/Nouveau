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

describe("GET /account/profile", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/account/profile");
    expect(res.status).toBe(401);
  });

  it("reflects a freshly signed-up user, with no broker account yet", async () => {
    const agent = await signedUpAgent("profile1@example.com");
    const res = await agent.get("/account/profile");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("profile1@example.com");
    expect(res.body.accountType).toBe("investor");
    expect(res.body.kycStatus).toBe("pending");
    expect(res.body.brokerAccount).toBeNull();
    expect(res.body.subscription).toBeNull(); // investors pay via profit split, not a subscription
    expect(new Date(res.body.memberSince).toString()).not.toBe("Invalid Date");
  });

  it("includes broker account details once created, and never a credential", async () => {
    const agent = await signedUpAgent("profile2@example.com");
    await agent
      .post("/onboarding/identity")
      .send({ fullName: "Jane Doe", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "P1234567" });
    await agent.post("/onboarding/broker-account").send({ broker: "TestBroker", login: "12345", serverName: "TestBroker-Live" });
    await agent.post("/onboarding/credentials").send({ mt5Password: "MySecretMt5Pass!23" });

    const res = await agent.get("/account/profile");
    expect(res.status).toBe(200);
    expect(res.body.kycStatus).toBe("verified");
    expect(res.body.brokerAccount).toEqual({
      broker: "TestBroker",
      login: "12345",
      serverName: "TestBroker-Live",
      ownership: "platform_opened",
      status: "pending",
    });

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("MySecretMt5Pass!23");
    expect(serialized).not.toContain("credentialRef");
  });

  it("reflects a trader's linked (not platform-opened) account, with no subscription yet", async () => {
    const agent = await signedUpAgent("profile-trader@example.com", "trader");
    await agent
      .post("/onboarding/identity")
      .send({ fullName: "Jane Doe", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "P1234567" });
    await agent.post("/onboarding/broker-link").send({ broker: "TestBroker", login: "12345", serverName: "TestBroker-Live" });
    await agent.post("/onboarding/credentials").send({ mt5Password: "ReadOnlyPass123" });

    const res = await agent.get("/account/profile");
    expect(res.status).toBe(200);
    expect(res.body.accountType).toBe("trader");
    expect(res.body.brokerAccount.ownership).toBe("user_linked");
    expect(res.body.subscription).toBeNull();

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("ReadOnlyPass123");
    expect(serialized).not.toContain("credentialKind");
  });

  it("reflects an active subscription once the trader picks a plan, and never a Stripe id", async () => {
    const agent = await signedUpAgent("profile-trader-sub@example.com", "trader");
    await agent
      .post("/onboarding/identity")
      .send({ fullName: "Jane Doe", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "P1234567" });
    await agent.post("/onboarding/broker-link").send({ broker: "TestBroker", login: "12345", serverName: "TestBroker-Live" });
    await agent.post("/onboarding/credentials").send({ mt5Password: "ReadOnlyPass123" });
    await agent.post("/onboarding/plan").send({ plan: "trader_monthly" });

    const res = await agent.get("/account/profile");
    expect(res.status).toBe(200);
    expect(res.body.subscription).toEqual({
      plan: "trader_monthly",
      status: "active",
      priceCents: 4900,
      currency: "usd",
    });

    const serialized = JSON.stringify(res.body);
    expect(serialized.toLowerCase()).not.toContain("stripe");
  });
});
