import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Types } from "mongoose";
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "../testSetup";
import { PasswordResetToken } from "./PasswordResetToken";

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
afterEach(clearTestDatabase);

describe("PasswordResetToken model", () => {
  it("creates a token record", async () => {
    const token = await PasswordResetToken.create({
      userId: new Types.ObjectId(),
      tokenHash: "a".repeat(64),
      expiresAt: new Date(Date.now() + 3600_000),
    });
    expect(token.usedAt).toBeUndefined();
  });

  it("enforces a unique tokenHash", async () => {
    const hash = "b".repeat(64);
    await PasswordResetToken.create({ userId: new Types.ObjectId(), tokenHash: hash, expiresAt: new Date(Date.now() + 3600_000) });
    await expect(
      PasswordResetToken.create({ userId: new Types.ObjectId(), tokenHash: hash, expiresAt: new Date(Date.now() + 3600_000) })
    ).rejects.toThrow();
  });

  it("has a TTL index on expiresAt so stale tokens expire on their own", async () => {
    const indexes = await PasswordResetToken.collection.indexes();
    const ttlIndex = indexes.find((i) => i.key && "expiresAt" in i.key);
    expect(ttlIndex).toBeDefined();
    expect(ttlIndex?.expireAfterSeconds).toBe(0);
  });
});
