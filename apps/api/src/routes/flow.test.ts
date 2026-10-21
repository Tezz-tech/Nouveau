import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MasterStrategy, BotPlan, BotSubscription, MtAccount } from "@nouveau/db";
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
  // The adapter instance is shared across the whole file — the DB clear
  // above doesn't touch its own in-memory call log.
  copyTradingAdapter.subscribeCalls = [];
});

async function seedBot(name: string, priceCents: string) {
  const strategy = await MasterStrategy.create({
    name,
    description: `${name} strategy.`,
    metaApiAccountId: `meta-${name.toLowerCase()}`,
    copyFactoryStrategyId: `cf-strategy-${name.toLowerCase()}`,
  });
  const plan = await BotPlan.create({ name: `${name} Monthly`, masterStrategyId: strategy._id, priceCents, defaultMultiplier: 1 });
  return { strategy, plan };
}

/** FakePaymentAdapter.parseWebhookEvent expects the raw body to already be
 *  a flat WebhookEvent-shaped JSON object — see that fake's own doc
 *  comment for why this deliberately isn't Paystack's real nested wire
 *  format (that mapping has its own dedicated test,
 *  PaystackPaymentAdapter.test.ts). */
function paystackWebhookBody(event: string, overrides: Partial<Record<string, unknown>> = {}) {
  return JSON.stringify({
    event,
    reference: "ref-1",
    customerCode: null,
    customerEmail: null,
    subscriptionCode: "sub-1",
    planCode: null,
    status: "success",
    metadata: null,
    ...overrides,
  });
}

describe("full flow: bots -> checkout -> webhook -> link -> connect -> active", () => {
  it("lists active bots with their plans", async () => {
    await seedBot("Scalper", "5000000");
    const res = await request(app).get("/bots");
    expect(res.status).toBe(200);
    expect(res.body.bots).toHaveLength(1);
    expect(res.body.bots[0].name).toBe("Scalper");
  });

  it("walks a user all the way from signup to an active, copy-trading subscription", async () => {
    const { strategy, plan } = await seedBot("Scalper", "5000000");
    const agent = request.agent(app);

    await agent.post("/auth/signup").send({ email: "flow@example.com", password: "correcthorsebattery", fullName: "Flow User" });

    const checkoutRes = await agent.post("/subscription/checkout").send({ botPlanId: plan._id.toString() });
    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.authorizationUrl).toMatch(/^https:\/\//);

    // No BotSubscription should exist yet — only a confirmed webhook creates one.
    expect(await BotSubscription.countDocuments({})).toBe(0);

    const me = await agent.get("/account/profile");
    const userRes = JSON.parse(JSON.stringify(me.body));
    expect(userRes.flow.stage).toBe("choose_bot");

    // Simulate Paystack confirming payment via webhook, with the metadata
    // this checkout would have attached.
    const session = await agent.get("/auth/session");
    const userId = session.body.userId as string;
    const webhookRes = await request(app)
      .post("/webhooks/paystack")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", "valid")
      .send(paystackWebhookBody("charge.success", { metadata: { userId, botPlanId: plan._id.toString() } }));
    expect(webhookRes.status).toBe(200);

    const sub = await BotSubscription.findOne({ userId });
    expect(sub?.status).toBe("awaiting_link");
    expect(sub?.mtAccountId).toBeUndefined();

    const profileAfterPay = await agent.get("/account/profile");
    expect(profileAfterPay.body.flow.stage).toBe("awaiting_link");

    const linkRes = await agent.post("/mt-account/link").send({
      broker: "TestBroker",
      login: "12345",
      serverName: "TestBroker-Live",
      tradingPassword: "RealTradingPass123!",
      consent: true,
    });
    expect(linkRes.status).toBe(202);

    const statusRes = await agent.get("/mt-account/status");
    expect(statusRes.status).toBe(200);
    // FakeCopyTradingAdapter defaults to "connected" immediately.
    expect(statusRes.body.connectionStage).toBe("connected");
    expect(statusRes.body.status).toBe("linked");

    const finalSub = await BotSubscription.findOne({ userId });
    expect(finalSub?.status).toBe("active");
    expect(finalSub?.copyFactoryAppliedAt).toBeDefined();
    expect(copyTradingAdapter.subscribeCalls).toHaveLength(1);
    expect(copyTradingAdapter.subscribeCalls[0]).toMatchObject({ copyFactoryStrategyId: strategy.copyFactoryStrategyId });

    const finalProfile = await agent.get("/account/profile");
    expect(finalProfile.body.flow.stage).toBe("complete");
    expect(finalProfile.body.bot.name).toBe("Scalper");
  });

  it("rejects linking an account before any payment has been confirmed", async () => {
    const agent = request.agent(app);
    await agent.post("/auth/signup").send({ email: "nopay@example.com", password: "correcthorsebattery", fullName: "No Pay" });
    const res = await agent.post("/mt-account/link").send({
      broker: "b",
      login: "l",
      serverName: "s",
      tradingPassword: "pw1234567",
      consent: true,
    });
    expect(res.status).toBe(409);
  });

  it("lets a user retry after a failed link attempt instead of locking them out", async () => {
    const { plan } = await seedBot("Scalper", "5000000");
    const agent = request.agent(app);
    await agent.post("/auth/signup").send({ email: "retry@example.com", password: "correcthorsebattery", fullName: "Retry User" });
    const session = await agent.get("/auth/session");
    const userId = session.body.userId as string;

    await request(app)
      .post("/webhooks/paystack")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", "valid")
      .send(paystackWebhookBody("charge.success", { metadata: { userId, botPlanId: plan._id.toString() } }));

    copyTradingAdapter.failNextLink = true;
    const failedLink = await agent.post("/mt-account/link").send({
      broker: "TestBroker",
      login: "12345",
      serverName: "TestBroker-Live",
      tradingPassword: "RealTradingPass123!",
      consent: true,
    });
    expect(failedLink.status).toBe(422);

    const failedAccount = await MtAccount.findOne({ userId });
    expect(failedAccount?.status).toBe("error");

    // Retry with the same credentials, now that the fake adapter isn't
    // forced to fail — must NOT be blocked by the errored account above.
    const retryLink = await agent.post("/mt-account/link").send({
      broker: "TestBroker",
      login: "12345",
      serverName: "TestBroker-Live",
      tradingPassword: "RealTradingPass123!",
      consent: true,
    });
    expect(retryLink.status).toBe(202);

    const statusRes = await agent.get("/mt-account/status");
    expect(statusRes.body.connectionStage).toBe("connected");

    const sub = await BotSubscription.findOne({ userId });
    expect(sub?.status).toBe("active");
  });

  it("rejects a webhook with an invalid signature", async () => {
    const res = await request(app)
      .post("/webhooks/paystack")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", "invalid")
      .send(paystackWebhookBody("charge.success"));
    expect(res.status).toBe(401);
  });

  it("switching bots re-points an already-linked account's subscription without re-linking", async () => {
    const { plan: scalperPlan } = await seedBot("Scalper", "5000000");
    const { strategy: longTermStrategy, plan: longTermPlan } = await seedBot("LongTerm", "3000000");
    const agent = request.agent(app);

    await agent.post("/auth/signup").send({ email: "switch@example.com", password: "correcthorsebattery", fullName: "Switch User" });
    const session = await agent.get("/auth/session");
    const userId = session.body.userId as string;

    await request(app)
      .post("/webhooks/paystack")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", "valid")
      .send(paystackWebhookBody("charge.success", { reference: "ref-a", subscriptionCode: "sub-a", metadata: { userId, botPlanId: scalperPlan._id.toString() } }));

    await agent.post("/mt-account/link").send({
      broker: "TestBroker",
      login: "12345",
      serverName: "TestBroker-Live",
      tradingPassword: "RealTradingPass123!",
      consent: true,
    });
    await agent.get("/mt-account/status"); // triggers the first subscribeToStrategy call

    const beforeSwitch = await BotSubscription.find({ userId }).sort({ createdAt: 1 });
    expect(beforeSwitch).toHaveLength(1);
    expect(beforeSwitch[0]!.status).toBe("active");

    // Switch: a second successful payment for a different plan.
    await request(app)
      .post("/webhooks/paystack")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", "valid")
      .send(
        paystackWebhookBody("charge.success", {
          reference: "ref-b",
          subscriptionCode: "sub-b",
          metadata: { userId, botPlanId: longTermPlan._id.toString() },
        })
      );

    const rows = await BotSubscription.find({ userId }).sort({ createdAt: 1 });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.status).toBe("superseded");
    expect(rows[1]!.status).toBe("active"); // already linked, so no re-link needed
    expect(rows[1]!.mtAccountId?.toString()).toBe(beforeSwitch[0]!.mtAccountId?.toString());

    expect(copyTradingAdapter.subscribeCalls).toHaveLength(2);
    expect(copyTradingAdapter.subscribeCalls[1]).toMatchObject({ copyFactoryStrategyId: longTermStrategy.copyFactoryStrategyId });

    const mtAccount = await MtAccount.findById(rows[1]!.mtAccountId);
    expect(mtAccount?.status).toBe("linked"); // untouched by the switch — same account, new strategy
  });

  it("is idempotent against a duplicate webhook delivery for the same subscription code", async () => {
    const { plan } = await seedBot("Scalper", "5000000");
    const agent = request.agent(app);
    await agent.post("/auth/signup").send({ email: "dupe@example.com", password: "correcthorsebattery", fullName: "Dupe User" });
    const session = await agent.get("/auth/session");
    const userId = session.body.userId as string;

    const body = paystackWebhookBody("charge.success", { subscriptionCode: "sub-dupe", metadata: { userId, botPlanId: plan._id.toString() } });
    await request(app).post("/webhooks/paystack").set("Content-Type", "application/json").set("x-paystack-signature", "valid").send(body);
    await request(app).post("/webhooks/paystack").set("Content-Type", "application/json").set("x-paystack-signature", "valid").send(body);

    expect(await BotSubscription.countDocuments({ userId })).toBe(1);
  });
});
