import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { buildTestApp } from "../test/testApp";
import type { Express } from "express";
import type SuperTest from "supertest";

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

describe("GET /onboarding/status", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/onboarding/status");
    expect(res.status).toBe(401);
  });

  it("reflects a freshly signed-up user's progress", async () => {
    const agent = await signedUpAgent("status@example.com");
    const res = await agent.get("/onboarding/status");
    expect(res.status).toBe(200);
    expect(res.body.completedSteps).toEqual(["account"]);
    expect(res.body.nextStep).toBe("identity");
    expect(res.body.progressFraction).toBeCloseTo(1 / 5);
    expect(res.body.steps).toHaveLength(5);
  });
});

describe("strict step ordering", () => {
  it("rejects broker-account before identity is complete", async () => {
    const agent = await signedUpAgent("order1@example.com");
    const res = await agent.post("/onboarding/broker-account").send({ broker: "TestBroker", login: "1", serverName: "s" });
    expect(res.status).toBe(409);
  });

  it("rejects credentials before broker-account exists", async () => {
    const agent = await signedUpAgent("order2@example.com");
    await agent
      .post("/onboarding/identity")
      .send({ fullName: "Jane Doe", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "P1234567" });
    const res = await agent.post("/onboarding/credentials").send({ mt5Password: "SomeMt5Pass!23" });
    expect(res.status).toBe(409);
  });

  it("rejects lpoa before credentials", async () => {
    const agent = await signedUpAgent("order3@example.com");
    await agent
      .post("/onboarding/identity")
      .send({ fullName: "Jane Doe", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "P1234567" });
    await agent.post("/onboarding/broker-account").send({ broker: "TestBroker", login: "1", serverName: "s" });
    const res = await agent.post("/onboarding/lpoa").send({ signedName: "Jane Doe" });
    expect(res.status).toBe(409);
  });
});

describe("identity step", () => {
  it("verifies well-formed identity data and advances the step", async () => {
    const agent = await signedUpAgent("kyc-ok@example.com");
    const res = await agent
      .post("/onboarding/identity")
      .send({ fullName: "Jane Doe", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "P1234567" });
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);

    const status = await agent.get("/onboarding/status");
    expect(status.body.completedSteps).toContain("identity");
    expect(status.body.nextStep).toBe("broker_account");
  });

  it("rejects placeholder-looking identity data and does not advance the step", async () => {
    const agent = await signedUpAgent("kyc-bad@example.com");
    // fullName "Test" alone is enough to trip the simulator's placeholder
    // check — idNumber must still satisfy the route's own Zod min(3) so the
    // request actually reaches the KYC adapter instead of failing schema
    // validation first (which would be a 400, not the 422 this test wants)
    const res = await agent.post("/onboarding/identity").send({ fullName: "Test", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "xxx" });
    expect(res.status).toBe(422);
    expect(res.body.verified).toBe(false);

    const status = await agent.get("/onboarding/status");
    expect(status.body.completedSteps).not.toContain("identity");
    expect(status.body.nextStep).toBe("identity");
  });

  it("rejects malformed input before it ever reaches the KYC adapter", async () => {
    const agent = await signedUpAgent("kyc-malformed@example.com");
    const res = await agent.post("/onboarding/identity").send({ fullName: "Jane Doe", dateOfBirth: "not-a-date", idType: "passport", idNumber: "P1" });
    expect(res.status).toBe(400);
  });
});

async function completeThroughCredentials(agent: SuperTest.Agent) {
  await agent.post("/onboarding/identity").send({ fullName: "Jane Doe", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "P1234567" });
  await agent.post("/onboarding/broker-account").send({ broker: "TestBroker", login: "12345", serverName: "TestBroker-Live" });
}

describe("broker-account and credentials steps", () => {
  it("creates a broker account and advances the step", async () => {
    const agent = await signedUpAgent("broker@example.com");
    await agent.post("/onboarding/identity").send({ fullName: "Jane Doe", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "P1234567" });
    const res = await agent.post("/onboarding/broker-account").send({ broker: "TestBroker", login: "12345", serverName: "TestBroker-Live" });
    expect(res.status).toBe(200);
    expect(res.body.completedSteps).toContain("broker_account");
  });

  it("captures and encrypts the MT5 credential, and never returns it", async () => {
    const agent = await signedUpAgent("creds@example.com");
    await completeThroughCredentials(agent);

    const res = await agent.post("/onboarding/credentials").send({ mt5Password: "MySecretMt5Pass!23" });
    expect(res.status).toBe(200);
    expect(res.body.completedSteps).toContain("credentials");

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("MySecretMt5Pass!23");
  });
});

describe("lpoa step and full completion", () => {
  it("walking every step in order reaches 'complete'", async () => {
    const agent = await signedUpAgent("full-flow@example.com");
    await completeThroughCredentials(agent);
    await agent.post("/onboarding/credentials").send({ mt5Password: "MySecretMt5Pass!23" });
    const res = await agent.post("/onboarding/lpoa").send({ signedName: "Jane Doe" });

    expect(res.status).toBe(200);
    expect(res.body.nextStep).toBe("complete");
    expect(res.body.progressFraction).toBe(1);
  });

  it("rejects a signature shorter than 3 characters", async () => {
    const agent = await signedUpAgent("short-name@example.com");
    await completeThroughCredentials(agent);
    await agent.post("/onboarding/credentials").send({ mt5Password: "MySecretMt5Pass!23" });
    const res = await agent.post("/onboarding/lpoa").send({ signedName: "AB" });
    expect(res.status).toBe(400);
  });

  it("cannot complete a step twice", async () => {
    const agent = await signedUpAgent("twice@example.com");
    const res = await agent
      .post("/onboarding/identity")
      .send({ fullName: "Jane Doe", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "P1234567" });
    expect(res.status).toBe(200);

    const again = await agent
      .post("/onboarding/identity")
      .send({ fullName: "Jane Doe", dateOfBirth: "1990-01-01", idType: "passport", idNumber: "P1234567" });
    expect(again.status).toBe(409);
  });
});
