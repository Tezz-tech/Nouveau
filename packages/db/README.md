# @nouveau/db

Mongoose schemas and models — the only package that defines what a User, an
MtAccount, a PasswordResetToken, or an LpoaSignature actually looks like in
MongoDB. Depends on `@nouveau/core` (for the `OnboardingStep` enum) and
`@nouveau/security` (for the encrypted-credential shape), so those two stay
the single source of truth for their respective concerns instead of being
redefined here.

## What this package owns

- **`models/User.ts`** — email/password auth fields, KYC status, onboarding
  progress. `passwordHash` is `select: false` — it is never returned by a
  plain query, only when a caller explicitly asks for it
  (`.select("+passwordHash")`), which makes "I accidentally serialized a
  password hash into an API response" much harder to do by accident.
- **`models/MtAccount.ts`** — the MT5 sub-account record. `credentialRef`
  mirrors `@nouveau/security`'s `EncryptedSecret` shape exactly and is
  optional — absent (not an empty placeholder) until the credential-capture
  onboarding step actually runs.
- **`models/PasswordResetToken.ts`** — stores only a token hash, with a
  MongoDB TTL index so an unused, expired token cleans itself up rather
  than sitting in the collection as a smaller and smaller (but never zero)
  brute-force target forever.
- **`models/LpoaSignature.ts`** — the signed Limited Power of Attorney,
  with a full audit trail (see the assumption flagged in the file about
  e-signature providers).
- **`connection.ts`** — one `connectToDatabase(uri)` call per process.
- **`testSetup.ts`** — `mongodb-memory-server` helpers, exported so
  `apps/api`'s integration tests can reuse the same in-memory database
  setup this package's own model tests use, rather than each reinventing it.

## What this package must never do

- **No business logic.** Whether a user is *allowed* to complete a given
  onboarding step is `@nouveau/core`'s `canCompleteStep` — this package
  only defines the shape `completedSteps` is stored in and validates that
  each entry is one of the five real step names.
- **No plaintext secrets, ever, as a schema field.** `MtAccount` has no
  `password` field, encrypted or not — only `credentialRef`, whose shape
  makes clear that decryption requires the KMS provider from
  `@nouveau/security`, not just database read access.
- **No decisions about which fields an API response includes.** That's
  `apps/api`'s job, deliberately kept separate from what's *storable* —
  `select: false` is a safety net against a lazy `res.json(user)`, not a
  substitute for the API layer explicitly choosing what to send back.

## Running the tests

```bash
npm test -w @nouveau/db
```

Uses `mongodb-memory-server` — a real MongoDB binary is downloaded on
first run and then cached; no external database or network dependency
after that first run.
