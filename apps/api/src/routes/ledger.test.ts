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

describe("GET /account/overview", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/account/overview");
    expect(res.status).toBe(401);
  });

  it("is all zero for a brand-new investor with no deposits yet", async () => {
    const agent = await signedUpAgent("overview-fresh@example.com");
    const res = await agent.get("/account/overview");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      custodyCents: "0",
      atRiskCents: "0",
      totalEquityCents: "0",
      totalDepositedCents: "0",
      targetCents: null,
      equitySeries: [],
    });
  });
});

describe("POST /account/deposit", () => {
  it("rejects a trader — deposits are investor-track only", async () => {
    const agent = await signedUpAgent("dep-trader@example.com", "trader");
    const res = await agent.post("/account/deposit").send({ amountCents: 100000 });
    expect(res.status).toBe(403);
  });

  it("splits a deposit 50/50 into custody and at-risk, and computes a real target", async () => {
    const agent = await signedUpAgent("dep-ok@example.com");
    const res = await agent.post("/account/deposit").send({ amountCents: 1_000_000 }); // $10,000
    expect(res.status).toBe(200);
    expect(res.body.custodyCents).toBe("500000");
    expect(res.body.atRiskCents).toBe("500000");
    expect(res.body.totalEquityCents).toBe("1000000");
    // target = custody + 2*atRisk = 500000 + 1000000 = 1500000 ($15,000 on a $10,000 deposit)
    expect(res.body.targetCents).toBe("1500000");
  });

  it("adds one equitySeries point per ledger event, in chronological order", async () => {
    const agent = await signedUpAgent("dep-series@example.com");
    await agent.post("/account/deposit").send({ amountCents: 1_000_000 });
    const res = await agent.post("/account/withdraw").send({ amountCents: 100_000 });
    expect(res.status).toBe(200);
    // deposit (1 point) + withdrawal_requested + withdrawal_completed (2 more)
    expect(res.body.equitySeries).toHaveLength(3);
    expect(res.body.equitySeries[0].totalEquityCents).toBe("1000000");
    expect(res.body.equitySeries.at(-1).totalEquityCents).toBe("900000");
  });

  it("accumulates across multiple deposits", async () => {
    const agent = await signedUpAgent("dep-multi@example.com");
    await agent.post("/account/deposit").send({ amountCents: 1_000_000 });
    const res = await agent.post("/account/deposit").send({ amountCents: 500_000 });
    expect(res.status).toBe(200);
    expect(res.body.totalEquityCents).toBe("1500000");
  });

  it("rejects a non-positive amount", async () => {
    const agent = await signedUpAgent("dep-bad@example.com");
    const res = await agent.post("/account/deposit").send({ amountCents: 0 });
    expect(res.status).toBe(400);
  });
});

describe("POST /account/withdraw", () => {
  it("rejects a trader — withdrawals are investor-track only", async () => {
    const agent = await signedUpAgent("wd-trader@example.com", "trader");
    const res = await agent.post("/account/withdraw").send({ amountCents: 1000 });
    expect(res.status).toBe(403);
  });

  it("rejects a withdrawal larger than the available custody balance", async () => {
    const agent = await signedUpAgent("wd-toobig@example.com");
    await agent.post("/account/deposit").send({ amountCents: 1_000_000 }); // 500000 custody
    const res = await agent.post("/account/withdraw").send({ amountCents: 600_000 });
    expect(res.status).toBe(422);
  });

  it("withdraws from custody, leaving at-risk untouched", async () => {
    const agent = await signedUpAgent("wd-ok@example.com");
    await agent.post("/account/deposit").send({ amountCents: 1_000_000 }); // 500000 custody / 500000 at-risk
    const res = await agent.post("/account/withdraw").send({ amountCents: 200_000 });
    expect(res.status).toBe(200);
    expect(res.body.custodyCents).toBe("300000");
    expect(res.body.atRiskCents).toBe("500000");
  });
});

describe("GET /account/transactions", () => {
  it("lists real transactions, most recent first", async () => {
    const agent = await signedUpAgent("txns@example.com");
    await agent.post("/account/deposit").send({ amountCents: 1_000_000 });
    await agent.post("/account/withdraw").send({ amountCents: 100_000 });

    const res = await agent.get("/account/transactions");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3); // deposit, withdrawal_requested, withdrawal_completed
    expect(res.body[0].kind).toBe("withdrawal_completed");
    expect(res.body.at(-1).kind).toBe("deposit");
    expect(res.body.at(-1).amountCents).toBe("1000000");
  });

  it("is empty for a user with no activity", async () => {
    const agent = await signedUpAgent("txns-empty@example.com");
    const res = await agent.get("/account/transactions");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
