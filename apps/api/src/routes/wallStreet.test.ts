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

describe("GET /market/quotes + /market/sessions", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/market/quotes")).status).toBe(401);
    expect((await request(app).get("/market/sessions")).status).toBe(401);
  });

  it("returns the watchlist with flags, markets, and session countdowns", async () => {
    const agent = await signedUpAgent("wall-street@example.com");
    const quotes = await agent.get("/market/quotes");
    expect(quotes.status).toBe(200);
    expect(quotes.body.dataSource).toBe("simulator");
    const symbols = (quotes.body.quotes as { symbol: string }[]).map((q) => q.symbol);
    expect(symbols).toEqual(expect.arrayContaining(["AAPL", "TSLA", "EUR/USD", "0700/HKG", "NESN/SIX", "7203/TYO"]));
    for (const q of quotes.body.quotes as { flag: string; market: string; price: number; changePercent: number }[]) {
      expect(typeof q.flag).toBe("string");
      expect(q.flag.length).toBeGreaterThan(0);
      expect(typeof q.market).toBe("string");
      expect(Number.isFinite(q.price)).toBe(true);
      expect(Number.isFinite(q.changePercent)).toBe(true);
    }

    const sessions = await agent.get("/market/sessions");
    expect(sessions.status).toBe(200);
    const regions = (sessions.body.sessions as { region: string }[]).map((s) => s.region);
    expect(regions).toEqual(expect.arrayContaining(["United States", "Hong Kong", "Japan", "Switzerland"]));
    for (const s of sessions.body.sessions as { flag: string; status: string; label: string }[]) {
      expect(typeof s.flag).toBe("string");
      expect(["open", "closed"]).toContain(s.status);
      expect(typeof s.label).toBe("string");
    }
  });
});

describe("desk chat", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/desk/messages")).status).toBe(401);
    expect((await request(app).post("/desk/messages").send({ body: "hi" })).status).toBe(401);
  });

  it("persists a message and returns history to both tracks", async () => {
    const investor = await signedUpAgent("desk-investor@example.com", "investor");
    const posted = await investor.post("/desk/messages").send({ body: "Hello floor" });
    expect(posted.status).toBe(201);
    expect(posted.body.message.body).toBe("Hello floor");

    const trader = await signedUpAgent("desk-trader@example.com", "trader");
    const history = await trader.get("/desk/messages");
    expect(history.status).toBe(200);
    expect(history.body.messages.map((m: { body: string }) => m.body)).toContain("Hello floor");
  });

  it("rejects empty and oversized messages", async () => {
    const agent = await signedUpAgent("desk-validation@example.com");
    expect((await agent.post("/desk/messages").send({ body: "  " })).status).toBe(400);
    expect((await agent.post("/desk/messages").send({ body: "x".repeat(501) })).status).toBe(400);
  });

  it("stale-flags cached quotes instead of blanking the strip", async () => {
    const agent = await signedUpAgent("wall-street-stale@example.com");
    const first = await agent.get("/market/quotes");
    expect(first.status).toBe(200);
    expect(first.body.quotes.length).toBeGreaterThan(0);
    // Simulator never rate-limits, so these are fresh — the stale path is
    // covered by the CachedMarketDataAdapter unit tests with a 429 mock.
    for (const q of first.body.quotes as { stale: boolean }[]) {
      expect(typeof q.stale).toBe("boolean");
    }
  });
});
