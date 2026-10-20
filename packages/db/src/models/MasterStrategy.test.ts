import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "../testSetup";
import { MasterStrategy } from "./MasterStrategy";

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
afterEach(clearTestDatabase);

describe("MasterStrategy model", () => {
  it("creates a strategy with sensible defaults", async () => {
    const strategy = await MasterStrategy.create({
      name: "Scalper",
      description: "Short-horizon intraday trades.",
      metaApiAccountId: "meta-acc-1",
    });
    expect(strategy.status).toBe("active");
    expect(strategy.copyFactoryStrategyId).toBeUndefined();
  });

  it("enforces a unique metaApiAccountId, so the idempotent seed script can't double-create", async () => {
    await MasterStrategy.create({ name: "Scalper", description: "d", metaApiAccountId: "dup-acc" });
    await expect(MasterStrategy.create({ name: "Scalper 2", description: "d2", metaApiAccountId: "dup-acc" })).rejects.toThrow();
  });

  it("rejects an invalid status", async () => {
    await expect(
      MasterStrategy.create({ name: "n", description: "d", metaApiAccountId: "acc-x", status: "not_a_status" })
    ).rejects.toThrow();
  });

  it("stores a copyFactoryStrategyConfig snapshot for idempotent diffing", async () => {
    const strategy = await MasterStrategy.create({
      name: "Day Trader",
      description: "d",
      metaApiAccountId: "acc-y",
      copyFactoryStrategyConfig: { maxTradeRisk: 0.02, timeSettings: { lifetimeInHours: 192 } },
    });
    const found = await MasterStrategy.findById(strategy._id);
    expect(found?.copyFactoryStrategyConfig).toEqual({ maxTradeRisk: 0.02, timeSettings: { lifetimeInHours: 192 } });
  });
});
