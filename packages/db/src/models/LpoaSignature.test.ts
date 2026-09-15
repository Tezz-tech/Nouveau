import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Types } from "mongoose";
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "../testSetup";
import { LpoaSignature } from "./LpoaSignature";

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
afterEach(clearTestDatabase);

describe("LpoaSignature model", () => {
  it("records a signature with a full audit trail", async () => {
    const signature = await LpoaSignature.create({
      userId: new Types.ObjectId(),
      documentVersion: "2026-09-15",
      documentHash: "c".repeat(64),
      signedName: "Jane Q. Doe",
      signedAt: new Date(),
      ipAddress: "203.0.113.7",
      userAgent: "Mozilla/5.0 (test)",
    });
    expect(signature.signedName).toBe("Jane Q. Doe");
    expect(signature.documentHash).toHaveLength(64);
  });

  it("requires every audit field", async () => {
    await expect(
      LpoaSignature.create({
        userId: new Types.ObjectId(),
        documentVersion: "2026-09-15",
        documentHash: "c".repeat(64),
        signedName: "Jane Q. Doe",
        signedAt: new Date(),
        // ipAddress and userAgent missing
      })
    ).rejects.toThrow();
  });
});
