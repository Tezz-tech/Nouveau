import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Types } from "mongoose";
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "../testSetup";
import { BotSubscription } from "./BotSubscription";

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
afterEach(clearTestDatabase);

describe("BotSubscription model", () => {
  const userId = new Types.ObjectId();
  const masterStrategyId = new Types.ObjectId();
  const botPlanId = new Types.ObjectId();

  it("creates a paid-but-unlinked subscription with no mtAccountId", async () => {
    const sub = await BotSubscription.create({ userId, masterStrategyId, botPlanId, multiplier: 1 });
    expect(sub.status).toBe("awaiting_link");
    expect(sub.mtAccountId).toBeUndefined();
    expect(sub.copyFactoryAppliedAt).toBeUndefined();
  });

  it("is append-only on a bot switch: the old row is superseded, a new one is inserted", async () => {
    const mtAccountId = new Types.ObjectId();
    const first = await BotSubscription.create({
      userId,
      masterStrategyId,
      botPlanId,
      mtAccountId,
      multiplier: 1,
      status: "active",
    });

    const newMasterStrategyId = new Types.ObjectId();
    const newBotPlanId = new Types.ObjectId();
    first.status = "superseded";
    await first.save();
    const second = await BotSubscription.create({
      userId,
      masterStrategyId: newMasterStrategyId,
      botPlanId: newBotPlanId,
      mtAccountId,
      multiplier: 2,
      status: "active",
    });

    const rows = await BotSubscription.find({ userId }).sort({ createdAt: 1 });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.status).toBe("superseded");
    expect(rows[0]!._id.toString()).toBe(first._id.toString());
    expect(rows[1]!.status).toBe("active");
    expect(rows[1]!._id.toString()).toBe(second._id.toString());
  });

  it("snapshots multiplier explicitly rather than requiring a plan lookup", async () => {
    const sub = await BotSubscription.create({ userId, masterStrategyId, botPlanId, multiplier: 1.5 });
    expect(sub.multiplier).toBe(1.5);
  });

  it("rejects an invalid status", async () => {
    await expect(
      BotSubscription.create({ userId, masterStrategyId, botPlanId, multiplier: 1, status: "not_a_status" })
    ).rejects.toThrow();
  });
});
