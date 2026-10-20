import * as argon2 from "argon2";

/**
 * Argon2id, per the brief. Options are deliberately fixed here rather than
 * configurable — a per-call tuning knob is how a hashing scheme quietly
 * gets weaker over time. If the parameters ever need to change, change them
 * here and let the `needsRehash` check upgrade old hashes on next login.
 */
const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MiB, OWASP's current minimum recommendation for argon2id
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plaintext: string): Promise<string> {
  if (plaintext.length === 0) {
    throw new RangeError("hashPassword: refusing to hash an empty password");
  }
  return argon2.hash(plaintext, HASH_OPTIONS);
}

/** Never throws on a bad password/hash pair — returns `false`. Only throws
 *  if the stored hash string itself is malformed (not an argon2 hash at
 *  all), which indicates data corruption, not a wrong password, and callers
 *  should treat that differently (log it, don't just say "wrong password"). */
export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  return argon2.verify(hash, plaintext);
}

/** Call after a successful login; if this returns true, re-hash the
 *  password with the current `HASH_OPTIONS` and store the new hash — the
 *  standard way to migrate everyone off weaker parameters without forcing a
 *  password reset. */
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, HASH_OPTIONS);
}
