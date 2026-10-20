import { describe, it, expect } from "vitest";
import { generateToken, hashToken, verifyTokenHash } from "./tokens";

describe("generateToken", () => {
  it("produces a URL-safe string with no padding characters", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("produces a different token every time", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateToken()));
    expect(tokens.size).toBe(50);
  });
});

describe("hashToken / verifyTokenHash", () => {
  it("verifies a matching token", () => {
    const token = generateToken();
    expect(verifyTokenHash(token, hashToken(token))).toBe(true);
  });

  it("rejects a non-matching token", () => {
    const token = generateToken();
    const otherToken = generateToken();
    expect(verifyTokenHash(otherToken, hashToken(token))).toBe(false);
  });

  it("hashing is deterministic (needed to look the token up by its hash)", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("never stores the raw token in its own hash", () => {
    const token = generateToken();
    expect(hashToken(token)).not.toContain(token);
  });

  it("handles a malformed/wrong-length stored hash without throwing", () => {
    expect(verifyTokenHash(generateToken(), "not-a-real-hash")).toBe(false);
  });
});
