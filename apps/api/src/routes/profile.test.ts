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

async function signedUpAgent(email: string) {
  const agent = request.agent(app);
  await agent.post("/auth/signup").send({ email, password: "correcthorsebattery" });
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
    expect(res.body.kycStatus).toBe("pending");
    expect(res.body.brokerAccount).toBeNull();
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
      status: "pending",
    });

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("MySecretMt5Pass!23");
    expect(serialized).not.toContain("credentialRef");
  });
});
