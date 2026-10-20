import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Types } from "mongoose";
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "../testSetup";
import { BotPlan } from "./BotPlan";

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
afterEach(clearTestDatabase);

describe("BotPlan model", () => {
  const masterStrategyId = new Types.ObjectId();

  it("creates a plan with sensible defaults and stores price as a decimal string", async () => {
    const plan = await BotPlan.create({ name: "Scalper Monthly", masterStrategyId, priceCents: "5000000" });
    expect(plan.currency).toBe("NGN");
    expect(plan.interval).toBe("monthly");
    expect(plan.defaultMultiplier).toBe(1);
    expect(plan.status).toBe("active");
    expect(typeof plan.priceCents).toBe("string");
  });

  it("round-trips a priceCents value too large for a safe JS number exactly, since it's stored as a string", async () => {
    const plan = await BotPlan.create({ name: "Big Plan", masterStrategyId, priceCents: "123456789012345" });
    const found = await BotPlan.findById(plan._id);
    expect(found?.priceCents).toBe("123456789012345");
  });

  it("rejects an invalid interval", async () => {
    await expect(
      BotPlan.create({ name: "n", masterStrategyId, priceCents: "100", interval: "weekly" })
    ).rejects.toThrow();
  });
});
