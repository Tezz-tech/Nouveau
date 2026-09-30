import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

describe("POST /market-chat/:base/:quote", () => {
  it("requires authentication", async () => {
    const response = await request(app).post("/market-chat/EUR/USD").send({ message: "Summarize this pair" });
    expect(response.status).toBe(401);
  });

  it("returns a factual candle snapshot to an investor without requiring a trading subscription", async () => {
    const agent = await signedUpAgent("market-chat-investor@example.com");
    const response = await agent.post("/market-chat/EUR/USD").send({ message: "Summarize this pair" });

    expect(response.status).toBe(200);
    expect(response.body.symbol).toBe("EUR/USD");
    expect(response.body.dataSource).toBe("simulator");
    expect(response.body.priceSeries).toHaveLength(60);
    expect(response.body.latest).toHaveProperty("close");
    expect(response.body.message).toContain("not a buy/sell recommendation");
    expect(response.body.stale).toBe(false);
  });

  it("validates pair format and requires a non-empty chat question", async () => {
    const agent = await signedUpAgent("market-chat-validation@example.com", "trader");
    const badPair = await agent.post("/market-chat/eurusd/USD").send({ message: "Summarize" });
    expect(badPair.status).toBe(400);

    const badMessage = await agent.post("/market-chat/EUR/USD").send({ message: "  " });
    expect(badMessage.status).toBe(400);
  });
});