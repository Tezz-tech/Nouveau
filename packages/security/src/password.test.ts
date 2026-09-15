import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, needsRehash } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("hashes and verifies the correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword(hash, "correct horse battery staple")).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword(hash, "wrong password")).toBe(false);
  });

  it("never stores the plaintext in the hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse battery staple");
  });

  it("produces a different hash for the same password each time (random salt)", async () => {
    const [a, b] = await Promise.all([hashPassword("same password"), hashPassword("same password")]);
    expect(a).not.toBe(b);
    expect(await verifyPassword(a, "same password")).toBe(true);
    expect(await verifyPassword(b, "same password")).toBe(true);
  });

  it("refuses to hash an empty password", async () => {
    await expect(hashPassword("")).rejects.toThrow(RangeError);
  });

  it("hash string identifies itself as argon2id", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });
});

describe("needsRehash", () => {
  it("a freshly-hashed password does not need rehashing", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(needsRehash(hash)).toBe(false);
  });

  it("a hash with weaker parameters needs rehashing", async () => {
    // timeCost has a hard floor of 2 in argon2's native binding, so vary
    // memoryCost instead to produce a hash under weaker parameters than
    // password.ts's fixed HASH_OPTIONS
    const weakHash = await import("argon2").then((argon2) =>
      argon2.hash("correct horse battery staple", { type: argon2.argon2id, memoryCost: 1024, timeCost: 2, parallelism: 1 })
    );
    expect(needsRehash(weakHash)).toBe(true);
  });
});
