import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { User, MasterStrategy, BotPlan } from "@nouveau/db";
import { buildTestApp } from "../test/testApp";
import type { FakeCopyTradingAdapter } from "../test/fakes/FakeCopyTradingAdapter";
import type { Express } from "express";

let ctx: Awaited<ReturnType<typeof buildTestApp>>;
let app: Express;
let copyTradingAdapter: FakeCopyTradingAdapter;

beforeAll(async () => {
  ctx = await buildTestApp();
  app = ctx.app;
  copyTradingAdapter = ctx.copyTradingAdapter;
});
afterAll(() => ctx.teardown());
beforeEach(async () => {
  await ctx.clear();
  copyTradingAdapter.subscribeCalls = [];
});

async function signUpAdmin(agent: ReturnType<typeof request.agent>, email: string) {
  const res = await agent.post("/auth/signup").send({ email, password: "correcthorsebattery", fullName: "Admin User" });
  await User.findByIdAndUpdate(res.body.userId, { role: "admin" });
  return res.body.userId as string;
}

describe("admin access control", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/admin/master-strategies");
    expect(res.status).toBe(401);
  });

  it("rejects a logged-in but non-admin user", async () => {
    const agent = request.agent(app);
    await agent.post("/auth/signup").send({ email: "regular@example.com", password: "correcthorsebattery", fullName: "Regular User" });
    const res = await agent.get("/admin/master-strategies");
    expect(res.status).toBe(403);
  });

  it("allows an admin user through", async () => {
    const agent = request.agent(app);
    await signUpAdmin(agent, "admin1@example.com");
    const res = await agent.get("/admin/master-strategies");
    expect(res.status).toBe(200);
  });
});

describe("admin master strategies", () => {
  it("creates a strategy immediately as active when given an existing MetaApi account id", async () => {
    const agent = request.agent(app);
    await signUpAdmin(agent, "admin2@example.com");

    const res = await agent.post("/admin/master-strategies").send({
      name: "Scalper",
      description: "Short-horizon trades.",
      existingMetaApiAccountId: "already-provisioned-acc",
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("active");
    expect(res.body.copyFactoryStrategyId).toBeTruthy();

    const stored = await MasterStrategy.findOne({ metaApiAccountId: "already-provisioned-acc" });
    expect(stored?.status).toBe("active");
  });

  it("starts provisioning (not blocking the request) when given fresh broker credentials, then finalizes once polled connected", async () => {
    const agent = request.agent(app);
    await signUpAdmin(agent, "admin3@example.com");

    const createRes = await agent.post("/admin/master-strategies").send({
      name: "Day Trader",
      description: "Intraday trades.",
      broker: "TestBroker",
      login: "99999",
      serverName: "TestBroker-Live",
      tradingPassword: "RealMasterPass123!",
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe("provisioning");
    expect(createRes.body.copyFactoryStrategyId).toBeNull();

    const statusRes = await agent.get(`/admin/master-strategies/${createRes.body.id}/status`);
    expect(statusRes.status).toBe(200);
    // FakeCopyTradingAdapter defaults every account to "connected" immediately.
    expect(statusRes.body.status).toBe("active");
    expect(statusRes.body.copyFactoryStrategyId).toBeTruthy();
  });

  it("marks a strategy failed, with the real error, when the provider account creation itself fails", async () => {
    const agent = request.agent(app);
    await signUpAdmin(agent, "admin4@example.com");

    copyTradingAdapter.failNextProviderAccount = true;
    const res = await agent.post("/admin/master-strategies").send({
      name: "Broken",
      description: "d",
      broker: "b",
      login: "l",
      serverName: "s",
      tradingPassword: "pw12345678",
    });
    expect(res.status).toBe(502);
  });

  it("rejects a request with neither an existing account id nor full credentials", async () => {
    const agent = request.agent(app);
    await signUpAdmin(agent, "admin5@example.com");
    const res = await agent.post("/admin/master-strategies").send({ name: "n", description: "d" });
    expect(res.status).toBe(400);
  });

  it("rejects a request with both an existing account id and full credentials", async () => {
    const agent = request.agent(app);
    await signUpAdmin(agent, "admin6@example.com");
    const res = await agent.post("/admin/master-strategies").send({
      name: "n",
      description: "d",
      existingMetaApiAccountId: "acc-1",
      broker: "b",
      login: "l",
      serverName: "s",
      tradingPassword: "pw12345678",
    });
    expect(res.status).toBe(400);
  });

  it("pauses and reactivates an active strategy", async () => {
    const agent = request.agent(app);
    await signUpAdmin(agent, "admin7@example.com");
    const created = await agent
      .post("/admin/master-strategies")
      .send({ name: "Scalper", description: "d", existingMetaApiAccountId: "acc-pause" });

    const paused = await agent.patch(`/admin/master-strategies/${created.body.id}/status`).send({ status: "paused" });
    expect(paused.status).toBe(200);
    expect(paused.body.status).toBe("paused");

    const reactivated = await agent.patch(`/admin/master-strategies/${created.body.id}/status`).send({ status: "active" });
    expect(reactivated.body.status).toBe("active");
  });
});

describe("admin bot plans", () => {
  async function seedStrategy(agent: ReturnType<typeof request.agent>, metaApiAccountId: string) {
    const res = await agent.post("/admin/master-strategies").send({ name: "Scalper", description: "d", existingMetaApiAccountId: metaApiAccountId });
    return res.body.id as string;
  }

  it("creates a bot plan linked to a master strategy", async () => {
    const agent = request.agent(app);
    await signUpAdmin(agent, "admin8@example.com");
    const strategyId = await seedStrategy(agent, "acc-for-plan");

    const res = await agent.post("/admin/bot-plans").send({ name: "Scalper Monthly", masterStrategyId: strategyId, priceCents: "5000000" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("active");
    expect(res.body.priceCents).toBe("5000000");

    const stored = await BotPlan.findOne({ masterStrategyId: strategyId });
    expect(stored?.name).toBe("Scalper Monthly");
  });

  it("rejects a plan for a master strategy that doesn't exist", async () => {
    const agent = request.agent(app);
    await signUpAdmin(agent, "admin9@example.com");
    const res = await agent.post("/admin/bot-plans").send({ name: "n", masterStrategyId: "000000000000000000000000", priceCents: "100" });
    expect(res.status).toBe(404);
  });

  it("retires a bot plan", async () => {
    const agent = request.agent(app);
    await signUpAdmin(agent, "admin10@example.com");
    const strategyId = await seedStrategy(agent, "acc-for-retire");
    const plan = await agent.post("/admin/bot-plans").send({ name: "n", masterStrategyId: strategyId, priceCents: "100" });

    const retired = await agent.patch(`/admin/bot-plans/${plan.body.id}/status`).send({ status: "retired" });
    expect(retired.status).toBe(200);
    expect(retired.body.status).toBe("retired");
  });
});

describe("admin user activity", () => {
  it("lists users with their current bot and MT account status", async () => {
    const agent = request.agent(app);
    await signUpAdmin(agent, "admin11@example.com");

    const strategyRes = await agent.post("/admin/master-strategies").send({ name: "Scalper", description: "d", existingMetaApiAccountId: "acc-activity" });
    const planRes = await agent.post("/admin/bot-plans").send({ name: "Scalper Monthly", masterStrategyId: strategyRes.body.id, priceCents: "5000000" });

    const userAgent = request.agent(app);
    const signupRes = await userAgent.post("/auth/signup").send({ email: "watched@example.com", password: "correcthorsebattery", fullName: "Watched User" });
    const watchedUserId = signupRes.body.userId as string;

    await request(app)
      .post("/webhooks/paystack")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", "valid")
      .send(
        JSON.stringify({
          event: "charge.success",
          reference: "ref-activity",
          subscriptionCode: "sub-activity",
          metadata: { userId: watchedUserId, botPlanId: planRes.body.id },
        })
      );

    await userAgent.post("/mt-account/link").send({
      broker: "TestBroker",
      login: "12345",
      serverName: "TestBroker-Live",
      tradingPassword: "RealTradingPass123!",
      consent: true,
    });
    await userAgent.get("/mt-account/status");

    const activityRes = await agent.get("/admin/users");
    expect(activityRes.status).toBe(200);
    const watchedRow = activityRes.body.users.find((u: { email: string }) => u.email === "watched@example.com");
    expect(watchedRow).toBeDefined();
    expect(watchedRow.subscription).toMatchObject({ botName: "Scalper", planName: "Scalper Monthly", status: "active" });
    expect(watchedRow.mtAccount).toMatchObject({ broker: "TestBroker", status: "linked", connectionStage: "connected" });

    // The admin themself should also show up, with no subscription.
    const adminRow = activityRes.body.users.find((u: { email: string }) => u.email === "admin11@example.com");
    expect(adminRow.role).toBe("admin");
    expect(adminRow.subscription).toBeNull();
  });
});
