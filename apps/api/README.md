# @nouveau/api

Phase 2 of the Nouveau platform: authentication and the onboarding wizard.
Express + MongoDB (via `@nouveau/db`), sessions (not JWT — `express-session`
+ `connect-mongo`), and everything provider-specific (KYC, email) behind an
adapter interface. KYC stays a simulator by choice; email has a real
`ResendEmailAdapter` alongside the console one, gated behind
`EMAIL_PROVIDER` so nothing sends real mail without deliberately opting in.

## What this app owns

- **`routes/auth.ts`** — signup, login, logout, session check, password
  reset request/confirm. Argon2 hashing and envelope encryption come from
  `@nouveau/security`; nothing here implements crypto itself.
- **`routes/onboarding.ts`** — the five-step wizard
  (`GET /onboarding/status`, then one `POST` per step). Step ordering is
  enforced by `@nouveau/core`'s `canCompleteStep` — the routes don't
  reimplement that logic, they just surface its `409` when violated.
- **`adapters/kyc/`** — `KycAdapter` interface + `SimulatorKycAdapter`
  (approves anything not obviously placeholder data). No real Dojah/Smile
  ID integration yet — the brief presents them as an either/or and doesn't
  pick one.
- **`adapters/email/`** — `EmailAdapter` interface + `ConsoleEmailAdapter`
  (logs instead of sending) and `ResendEmailAdapter` (client's chosen
  provider, talks to Resend's REST API directly over `fetch`).
  `adapters/email/provider.ts`'s `getEmailAdapter()` picks between them from
  `EMAIL_PROVIDER` — defaults to `console` so a dev machine never sends real
  email by accident.
- **`adapters/kms/provider.ts`** — constructs the `LocalKmsProvider` from
  `@nouveau/security` using an env-provided master key.
- **`services/lpoaDocument.ts`** — placeholder LPOA text + versioned hash.
  **Not reviewed by counsel — flagged, not to be treated as real legal
  text.**

## What this app must never do

- **Never return a password, a password hash, or a decrypted MT5 credential
  in any API response.** The onboarding routes explicitly avoid echoing
  `mt5Password` back even in the success path; `User`'s `passwordHash` is
  `select: false` at the schema level as a second line of defense.
- **Never let `TRADING_MODE` default to `live`.** `config/env.ts` defaults
  it to `paper`; `server.ts` refuses to boot at all if it's ever `live`,
  since no broker adapter, strategy engine, or kill switch exist yet to
  make live trading safe.
- **Never skip `@nouveau/core`'s step-ordering check.** Every onboarding
  route calls into the service layer, which calls `canCompleteStep`/
  `completeStep` before touching the database — a route must not update
  `onboarding.completedSteps` directly.

## Environment

Copy `.env.example` to `.env` and fill in real values — `SESSION_SECRET`
and `KMS_LOCAL_MASTER_KEY` need real random values
(`openssl rand -base64 32` for the KMS key specifically, since it's
base64-decoded to exactly 32 bytes).

## Running

```bash
npm run dev -w @nouveau/api     # tsx watch — needs a running MongoDB at MONGODB_URI
npm test -w @nouveau/api        # integration tests against mongodb-memory-server, no real DB needed
```

## Assumptions flagged

1. **The LPOA text is a fuller draft template now (client requested this,
   2026-09-15), but is still not drafted or reviewed by counsel** — it must
   not be treated as real legal text until a lawyer signs off.
2. **Broker account creation (`POST /onboarding/broker-account`) accepts
   broker/login/serverName directly from the client** rather than through
   a real "partner link" redirect/webhook flow, since no broker partner is
   chosen yet — client confirmed (2026-09-15) to keep this stub as-is until
   a partner is signed (Phase 5). This is the one onboarding step most
   likely to need a real rework once a broker is selected — everything else
   in the wizard should be unaffected.

## Resolved

- **KYC provider stays the simulator** — client confirmed (2026-09-15) not
  to integrate Dojah/Smile ID yet. Swapping one in later means writing
  `DojahAdapter`/`SmileIdAdapter` against the existing `KycAdapter`
  interface; no route or service code should need to change.
- **Email provider is Resend** — client confirmed (2026-09-15).
  `ResendEmailAdapter` is built; set `EMAIL_PROVIDER=resend` plus
  `RESEND_API_KEY`/`EMAIL_FROM` to use it. Defaults to console-logging
  otherwise.
- **Revenue-split eligibility**: every user gets `subscription_plus_split`,
  no eligibility gate. See `@nouveau/core`'s revenue README section.
