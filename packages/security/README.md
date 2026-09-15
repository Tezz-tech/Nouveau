# @nouveau/security

Password hashing, envelope encryption, and secure token generation. No
database, no HTTP — a thin, well-tested layer over Node's `crypto` module
and `argon2`, used by `apps/api` and (for decryption specifically)
`services/allocator`.

## What this package owns

- **`password.ts`** — Argon2id hashing/verification with fixed parameters
  (not caller-configurable, on purpose — see the comment in the file) and a
  `needsRehash` check for migrating users off weaker parameters over time.
- **`envelope.ts`** — envelope encryption for secrets that must never be
  stored in plaintext even encrypted-at-rest by the database (MT5
  passwords, specifically — see invariant in the root README and section 8
  of the original brief: *"Don't store MT5 passwords in Postgres, even
  encrypted at rest by the database... Never in logs, never in an error
  message, never in an API response"*). `LocalKmsProvider` is a
  same-interface stand-in for a real cloud KMS (AWS KMS / GCP KMS) —
  nothing else in this codebase should need to change when that swap
  happens, only which `KmsProvider` gets constructed.
- **`tokens.ts`** — high-entropy tokens for password reset / email
  verification links, stored as a hash (never the raw token), compared in
  constant time.

## What this package must never do

- **Never log a plaintext secret, a plaintext password, or a data key.**
  Every function here that touches one either returns it once (for the
  caller to use immediately and discard) or never returns it at all.
- **Never weaken the argon2 parameters for convenience.** Slow hashing is
  the point — if it's slowing down a test suite, use a longer timeout, not
  a weaker hash.
- **Never let the API service hold the KMS master key in production.**
  `LocalKmsProvider`'s constructor takes the key as a plain argument on
  purpose, so the caller controls exactly where that key's environment
  variable is injected. In production, that's the allocator service's
  environment only — see the access-control note in `envelope.ts`. This
  package cannot enforce that boundary itself; it's a deployment
  responsibility that depends on this package being used correctly.

## Running the tests

```bash
npm test -w @nouveau/security
```

Argon2 hashing is deliberately slow (see `vitest.config.ts` for the
extended test timeout) — this is expected, not a performance bug.
