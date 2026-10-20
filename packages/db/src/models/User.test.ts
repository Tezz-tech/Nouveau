import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "../testSetup";
import { User } from "./User";

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
afterEach(clearTestDatabase);

describe("User model", () => {
  it("creates a user and lowercases the email", async () => {
    const user = await User.create({ email: "Test@Example.com", passwordHash: "hashed", fullName: "Test User" });
    expect(user.email).toBe("test@example.com");
    expect(user.paystackCustomerCode).toBeUndefined();
  });

  it("enforces a unique email", async () => {
    await User.create({ email: "dup@example.com", passwordHash: "hashed", fullName: "Dup User" });
    await expect(User.create({ email: "dup@example.com", passwordHash: "hashed2", fullName: "Dup User 2" })).rejects.toThrow();
  });

  it("passwordHash is excluded from a plain query by default", async () => {
    await User.create({ email: "secret@example.com", passwordHash: "should-not-leak", fullName: "Secret User" });
    const found = await User.findOne({ email: "secret@example.com" });
    expect(found?.passwordHash).toBeUndefined();
  });

  it("passwordHash is available when explicitly selected", async () => {
    await User.create({ email: "secret2@example.com", passwordHash: "should-be-here", fullName: "Secret User 2" });
    const found = await User.findOne({ email: "secret2@example.com" }).select("+passwordHash");
    expect(found?.passwordHash).toBe("should-be-here");
  });

  it("requires fullName", async () => {
    await expect(User.create({ email: "noname@example.com", passwordHash: "hashed" })).rejects.toThrow();
  });
});
