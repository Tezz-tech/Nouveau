import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "../testSetup";
import { User, getCompletedOnboardingSteps } from "./User";

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
afterEach(clearTestDatabase);

describe("User model", () => {
  it("creates a user with sensible defaults", async () => {
    const user = await User.create({ email: "Test@Example.com", passwordHash: "hashed" });
    expect(user.email).toBe("test@example.com"); // lowercased
    expect(user.kycStatus).toBe("pending");
    expect(user.onboarding?.completedSteps).toEqual([]);
  });

  it("enforces a unique email", async () => {
    await User.create({ email: "dup@example.com", passwordHash: "hashed" });
    await expect(User.create({ email: "dup@example.com", passwordHash: "hashed2" })).rejects.toThrow();
  });

  it("passwordHash is excluded from a plain query by default", async () => {
    await User.create({ email: "secret@example.com", passwordHash: "should-not-leak" });
    const found = await User.findOne({ email: "secret@example.com" });
    expect(found?.passwordHash).toBeUndefined();
  });

  it("passwordHash is available when explicitly selected", async () => {
    await User.create({ email: "secret2@example.com", passwordHash: "should-be-here" });
    const found = await User.findOne({ email: "secret2@example.com" }).select("+passwordHash");
    expect(found?.passwordHash).toBe("should-be-here");
  });

  it("rejects an onboarding step that isn't one of the five recognized values", async () => {
    await expect(
      User.create({
        email: "bad@example.com",
        passwordHash: "hashed",
        onboarding: { completedSteps: ["not_a_real_step"] },
      })
    ).rejects.toThrow();
  });

  it("accepts a valid partial set of completed onboarding steps", async () => {
    const user = await User.create({
      email: "progress@example.com",
      passwordHash: "hashed",
      onboarding: { completedSteps: ["account", "identity"] },
    });
    expect(getCompletedOnboardingSteps(user)).toEqual(["account", "identity"]);
  });

  it("rejects an invalid kycStatus", async () => {
    await expect(
      User.create({ email: "kyc@example.com", passwordHash: "hashed", kycStatus: "not_a_status" })
    ).rejects.toThrow();
  });
});
