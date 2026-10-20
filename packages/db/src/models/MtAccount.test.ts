import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Types } from "mongoose";
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "../testSetup";
import { MtAccount } from "./MtAccount";

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
afterEach(clearTestDatabase);

const consent = { version: "v1", acceptedAt: new Date(), acceptedIp: "127.0.0.1", userAgent: "vitest" };

describe("MtAccount model", () => {
  const userId = new Types.ObjectId();

  it("creates an account without a credentialRef (not captured yet) and defaults connectionStage/status", async () => {
    const account = await MtAccount.create({ userId, broker: "TestBroker", login: "12345", serverName: "TestBroker-Live", consent });
    expect(account.status).toBe("pending");
    expect(account.connectionStage).toBe("deploying");
    expect(account.copyFactorySubscriberConfigured).toBe(false);
    expect(account.credentialRef).toBeUndefined();
  });

  it("requires recorded consent", async () => {
    await expect(MtAccount.create({ userId, broker: "b", login: "l", serverName: "s" })).rejects.toThrow();
  });

  it("stores a full envelope-encrypted credential shape", async () => {
    const account = await MtAccount.create({
      userId,
      broker: "TestBroker",
      login: "12345",
      serverName: "TestBroker-Live",
      consent,
      credentialRef: {
        kmsKeyId: "local-dev-master-key",
        wrappedDataKey: "d2FhYQ==",
        iv: "aXY=",
        authTag: "dGFn",
        ciphertext: "Y2lwaGVy",
      },
    });
    const found = await MtAccount.findById(account._id);
    expect(found?.credentialRef?.kmsKeyId).toBe("local-dev-master-key");
    expect(found?.credentialRef?.ciphertext).toBe("Y2lwaGVy");
  });

  it("rejects a credentialRef missing a required sub-field", async () => {
    await expect(
      MtAccount.create({
        userId,
        broker: "TestBroker",
        login: "12345",
        serverName: "TestBroker-Live",
        consent,
        credentialRef: {
          kmsKeyId: "local-dev-master-key",
          wrappedDataKey: "d2FhYQ==",
          iv: "aXY=",
          // authTag missing
          ciphertext: "Y2lwaGVy",
        },
      })
    ).rejects.toThrow();
  });

  it("rejects an invalid status or connectionStage", async () => {
    await expect(MtAccount.create({ userId, broker: "b", login: "l", serverName: "s", consent, status: "not_a_status" })).rejects.toThrow();
    await expect(
      MtAccount.create({ userId, broker: "b", login: "l", serverName: "s", consent, connectionStage: "not_a_stage" })
    ).rejects.toThrow();
  });

  it("stores a lastError on failure", async () => {
    const account = await MtAccount.create({
      userId,
      broker: "b",
      login: "l",
      serverName: "s",
      consent,
      connectionStage: "failed",
      status: "error",
      lastError: { message: "wrong password", at: new Date() },
    });
    expect(account.lastError?.message).toBe("wrong password");
  });
});
