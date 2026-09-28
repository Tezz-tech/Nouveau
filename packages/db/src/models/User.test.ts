import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "../testSetup";
import { User, getCompletedOnboardingSteps } from "./User";

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
afterEach(clearTestDatabase);

describe("User model", () => {
  it("creates a user with sensible defaults", async () => {
    const user = await User.create({ email: "Test@Example.com", passwordHash: "hashed", accountType: "investor" });
    expect(user.email).toBe("test@example.com"); // lowercased
    expect(user.kycStatus).toBe("pending");
    expect(user.onboarding?.completedSteps).toEqual([]);
  });

  it("enforces a unique email", async () => {
    await User.create({ email: "dup@example.com", passwordHash: "hashed", accountType: "investor" });
    await expect(User.create({ email: "dup@example.com", passwordHash: "hashed2", accountType: "investor" })).rejects.toThrow();
  });

  it("passwordHash is excluded from a plain query by default", async () => {
    await User.create({ email: "secret@example.com", passwordHash: "should-not-leak", accountType: "investor" });
    const found = await User.findOne({ email: "secret@example.com" });
    expect(found?.passwordHash).toBeUndefined();
  });

  it("passwordHash is available when explicitly selected", async () => {
    await User.create({ email: "secret2@example.com", passwordHash: "should-be-here", accountType: "investor" });
    const found = await User.findOne({ email: "secret2@example.com" }).select("+passwordHash");
    expect(found?.passwordHash).toBe("should-be-here");
  });

  it("rejects an onboarding step that isn't a recognized value on either track", async () => {
    await expect(
      User.create({
        email: "bad@example.com",
        passwordHash: "hashed",
        accountType: "investor",
        onboarding: { completedSteps: ["not_a_real_step"] },
      })
    ).rejects.toThrow();
  });

  it("accepts a valid partial set of completed onboarding steps", async () => {
    const user = await User.create({
      email: "progress@example.com",
      passwordHash: "hashed",
      accountType: "investor",
      onboarding: { completedSteps: ["account", "identity"] },
    });
    expect(getCompletedOnboardingSteps(user)).toEqual(["account", "identity"]);
  });

  it("accepts trader-only step names (broker_link, plan) since the enum covers both tracks", async () => {
    const user = await User.create({
      email: "trader-progress@example.com",
      passwordHash: "hashed",
      accountType: "trader",
      onboarding: { completedSteps: ["account", "identity", "broker_link"] },
    });
    expect(getCompletedOnboardingSteps(user)).toEqual(["account", "identity", "broker_link"]);
  });

  it("rejects an invalid kycStatus", async () => {
    await expect(
      User.create({ email: "kyc@example.com", passwordHash: "hashed", accountType: "investor", kycStatus: "not_a_status" })
    ).rejects.toThrow();
  });

  it("defaults accountType to investor when omitted, rather than rejecting", async () => {
    const user = await User.create({ email: "no-type@example.com", passwordHash: "hashed" });
    expect(user.accountType).toBe("investor");
  });

  it("rejects an accountType that isn't investor or trader", async () => {
    await expect(
      User.create({ email: "bad-type@example.com", passwordHash: "hashed", accountType: "not_a_type" })
    ).rejects.toThrow();
  });

  it("reads back accountType as 'investor' for a legacy document that predates the field entirely — regression test for a real production crash (2026-09-28)", async () => {
    // Simulates every real user who signed up before `accountType` existed:
    // bypass Mongoose entirely (no schema defaults applied) so the raw
    // document in the database genuinely has no `accountType` key at all,
    // exactly like the rows already sitting in production. `required: true`
    // alone does nothing for documents that already exist — this is what
    // `default: "investor"` on the schema path is for.
    await User.collection.insertOne({
      email: "legacy@example.com",
      passwordHash: "hashed",
      kycStatus: "pending",
      onboarding: { completedSteps: ["account", "identity"] },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await User.findOne({ email: "legacy@example.com" });
    expect(user?.accountType).toBe("investor");
  });
});
