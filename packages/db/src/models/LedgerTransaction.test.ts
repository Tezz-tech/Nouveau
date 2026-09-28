import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Types } from "mongoose";
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "../testSetup";
import { LedgerTransaction } from "./LedgerTransaction";

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
afterEach(clearTestDatabase);

describe("LedgerTransaction model", () => {
  const userId = new Types.ObjectId();

  it("persists a balanced transaction's entries as decimal-string amounts", async () => {
    const txn = await LedgerTransaction.create({
      userId,
      kind: "deposit",
      reference: "dep_1",
      entries: [
        { account: "external", amountCents: "-1000000" },
        { account: `custody:${userId}`, amountCents: "500000" },
        { account: `atrisk:${userId}`, amountCents: "500000" },
      ],
      displayAmountCents: "1000000",
      description: "Deposit",
    });
    expect(txn.entries).toHaveLength(3);
    expect(txn.entries[1]!.amountCents).toBe("500000");
  });

  it("enforces a unique reference", async () => {
    const base = {
      userId,
      kind: "deposit",
      entries: [{ account: "a", amountCents: "1" }],
      displayAmountCents: "1",
      description: "d",
    };
    await LedgerTransaction.create({ ...base, reference: "dup_ref" });
    await expect(LedgerTransaction.create({ ...base, reference: "dup_ref" })).rejects.toThrow();
  });
});
