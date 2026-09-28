import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Types } from "mongoose";
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "../testSetup";
import { MtAccount } from "./MtAccount";

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
afterEach(clearTestDatabase);

describe("MtAccount model", () => {
  const userId = new Types.ObjectId();

  it("creates an account without a credentialRef (not captured yet)", async () => {
    const account = await MtAccount.create({
      userId,
      broker: "TestBroker",
      login: "12345",
      serverName: "TestBroker-Live",
    });
    expect(account.status).toBe("pending");
    expect(account.credentialRef).toBeUndefined();
  });

  it("stores a full envelope-encrypted credential shape", async () => {
    const account = await MtAccount.create({
      userId,
      broker: "TestBroker",
      login: "12345",
      serverName: "TestBroker-Live",
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

  it("rejects an invalid status", async () => {
    await expect(
      MtAccount.create({ userId, broker: "b", login: "l", serverName: "s", status: "not_a_status" })
    ).rejects.toThrow();
  });

  it("defaults ownership to platform_opened (the investor track's shape) when not specified", async () => {
    const account = await MtAccount.create({ userId, broker: "b", login: "l", serverName: "s" });
    expect(account.ownership).toBe("platform_opened");
  });

  it("accepts a user_linked account with an investor_password credentialKind", async () => {
    const account = await MtAccount.create({
      userId,
      broker: "b",
      login: "l",
      serverName: "s",
      ownership: "user_linked",
      credentialKind: "investor_password",
    });
    expect(account.ownership).toBe("user_linked");
    expect(account.credentialKind).toBe("investor_password");
  });

  it("rejects an invalid ownership or credentialKind value", async () => {
    await expect(
      MtAccount.create({ userId, broker: "b", login: "l", serverName: "s", ownership: "not_a_kind" })
    ).rejects.toThrow();
    await expect(
      MtAccount.create({ userId, broker: "b", login: "l", serverName: "s", credentialKind: "not_a_kind" })
    ).rejects.toThrow();
  });
});
