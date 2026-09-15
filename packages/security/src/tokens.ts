import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/** A high-entropy, URL-safe token (password reset links, email verification
 *  links, etc.) — 256 bits of randomness. Return this to the user (in the
 *  reset link); store only its hash (see `hashToken`), the same way a
 *  password is never stored in plaintext. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 is fine here — unlike a password, this token is already 256 bits
 *  of uniform randomness, not something a human chose, so it isn't subject
 *  to brute-force/dictionary attacks the way a password hash has to defend
 *  against. Argon2 would be pointless extra cost for no security benefit. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison for anything that compares a token/hash against
 *  a stored value — never use `===` for this, it leaks timing information
 *  an attacker can use to guess the value one byte at a time. */
export function verifyTokenHash(token: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}
