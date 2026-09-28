# @nouveau/api

Phase 2+ of the Nouveau platform: authentication, two account-type onboarding
tracks, and the trader track's live signal tool. Express + MongoDB (via
`@nouveau/db`), sessions (not JWT — `express-session` + `connect-mongo`),
and everything provider-specific (KYC, email, market data, broker linking,
payments, signal narration) behind an adapter interface.

## Two account types, one API

Every user picks a track at signup (`accountType` on `User`, required,
immutable in this build) and that choice drives which onboarding steps,
revenue model, and dashboard data apply — see `@nouveau/core`'s
`stepsFor`/`defaultRevenueModelFor` for the actual branching logic; this app
just resolves through those rather than re-deciding anything itself.

- **Investor** — deposits money, Nouveau opens an MT4/5 sub-account and
  copy-trades the at-risk half, pays via the profit-split revenue model.
  Onboarding: `account → identity → broker_account → credentials → lpoa`.
  This is the original Phase 2 flow, unchanged.
- **Trader** — links their **own** existing MT4/5 account (read-only —
  never Nouveau's to trade), gets live buy/sell signals computed from real
  technical indicators, pays a flat subscription. Onboarding:
  `account → identity → broker_link → credentials → plan` — no `lpoa` at
  all, since a trader never authorizes Nouveau to trade their money.

## What this app owns

- **`routes/auth.ts`** — signup (now takes `accountType`), login, logout,
  session check, password reset request/confirm. Argon2 hashing and
  envelope encryption come from `@nouveau/security`; nothing here
  implements crypto itself.
- **`routes/onboarding.ts`** — one `GET /onboarding/status` plus a `POST`
  per step across both tracks (`identity`, `broker-account` XOR
  `broker-link`, `credentials`, `lpoa` XOR `plan`). Step ordering — and
  which steps exist at all — are enforced by `@nouveau/core`'s
  `canCompleteStep` against the user's own track — a route never
  reimplements that logic, it just surfaces its `409`/`422` when violated.
  `services/onboardingService.ts`'s `captureCredentials` is shared by both
  tracks: for a trader it also calls `BrokerLinkAdapter.verifyReadOnlyAccess`
  before storing anything, since a trader's live signals are scoped to
  whatever account this creates.
- **`routes/signals.ts`** (`GET /signals/:base/:quote`) — trader-track only,
  requires an active subscription, rate-limited
  (`middleware/rateLimit.ts`'s `signalsRateLimit`). Pulls candles from a
  `MarketDataAdapter`, computes a bias via `@nouveau/core`'s pure,
  deterministic `computeSignal` (moving-average/RSI/momentum voting — no
  ML, no LLM deciding the bias), narrates it via a `NarrationAdapter`, and
  logs every emission to the append-only `SignalLog` collection
  (`services/signalDisclaimer.ts` holds the versioned disclaimer text shown
  alongside every signal, same versioning discipline as
  `LPOA_DOCUMENT_VERSION`).
- **`routes/profile.ts`** (`GET /account/profile`) — read-only account
  summary (email, `accountType`, KYC status, broker account details,
  subscription for a trader) for the dashboard's Profile/Billing pages.
  Never includes `passwordHash`, an MtAccount's `credentialRef`/
  `credentialKind`, or a Subscription's Stripe/processor ids — not just
  unset, not present in the response shape at all.
- **`routes/ledger.ts`** (`GET /account/overview`, `POST /account/deposit`,
  `POST /account/withdraw`, `GET /account/transactions`) — investor-track
  only (2026-09-28). Every number is computed live in
  `services/ledgerService.ts` by replaying a user's persisted
  `LedgerTransaction` rows through `@nouveau/core`'s `ledger.ts` functions
  (`splitDeposit`, `requestWithdrawal`, `completeWithdrawal`,
  `computeTarget`) — never a stored "current balance" that could drift
  from the history that's supposed to explain it. A deposit really splits
  50/50 into custody/at-risk (invariant #2 holds by construction, same as
  everywhere else `splitDeposit` is used); a withdrawal is rejected with a
  `422` if it exceeds the real custody balance. **What's still simulated is
  the payment capture itself** — `PaymentAdapter.chargeDeposit`/`payOut`
  always succeed on the simulator, so no real bank transfer or card charge
  happens until a real processor is connected (see "Assumptions flagged").
  `LedgerTransaction.amountCents` fields are decimal-string bigints, never
  a native numeric BSON type, same discipline as `@nouveau/core`'s
  `Cents` — money must never touch a float or an implicit-precision
  integer type.
- **`adapters/kyc/`** — `KycAdapter` interface + `SimulatorKycAdapter`
  (approves anything not obviously placeholder data). No real Dojah/Smile
  ID integration yet — the brief presents them as an either/or and doesn't
  pick one.
- **`adapters/marketData/`, `adapters/brokerLink/`, `adapters/payment/`,
  `adapters/narration/`** — trader-track integrations, each the same
  interface + safe-simulator-default + env-gated-real-implementation shape
  as `adapters/kyc/`. All four currently run on their simulator only (see
  "Assumptions flagged" below for exactly what real credentials each real
  implementation is waiting on).
- **`adapters/email/`** — `EmailAdapter` interface + `ConsoleEmailAdapter`
  (logs instead of sending) and `ResendEmailAdapter` (client's chosen
  provider, talks to Resend's REST API directly over `fetch`).
  `adapters/email/provider.ts`'s `getEmailAdapter()` picks between them from
  `EMAIL_PROVIDER` — defaults to `console` so a dev machine never sends real
  email by accident.
- **`adapters/kms/provider.ts`** — constructs the `LocalKmsProvider` from
  `@nouveau/security` using an env-provided master key.
- **`services/lpoaDocument.ts`** — placeholder LPOA text + versioned hash
  (investor track only). **Not reviewed by counsel — flagged, not to be
  treated as real legal text.**

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
- **Never store a full trading password against a `user_linked` MtAccount.**
  A trader's account is only ever meant to hold MT4/5's read-only
  "investor password" (`credentialKind: "investor_password"`) — this is
  the infrastructure-level reason Nouveau can't place a trade on a trader's
  account even if the rest of the system were compromised, not just a UI
  label. `onboardingService.captureCredentials` asserts this pairing
  explicitly rather than trusting the caller.

## Environment

Copy `.env.example` to `.env` and fill in real values — `SESSION_SECRET`
and `KMS_LOCAL_MASTER_KEY` need real random values
(`openssl rand -base64 32` for the KMS key specifically, since it's
base64-decoded to exactly 32 bytes).

The trader-track integrations each default to their simulator and don't
need any env vars set for local dev: `MARKET_DATA_PROVIDER`,
`BROKER_LINK_PROVIDER`, `PAYMENT_PROVIDER`, `LLM_NARRATION_PROVIDER`. Flip
one to its real value only once the matching credential exists (see
"Assumptions flagged") — `config/env.ts` refuses to boot if a real provider
is selected without its credential, and refuses to boot with
`TRADING_MODE=live` while *any* of these is still on its simulator.

## Running

```bash
npm run dev -w @nouveau/api     # tsx watch — needs a running MongoDB at MONGODB_URI
npm test -w @nouveau/api        # integration tests against mongodb-memory-server, no real DB needed
```

## Deploying

This is a stateful Express app (sessions, in-memory rate limiting), which
doesn't fit a serverless platform as naturally as a traditional
always-running host — but it's set up to work on Vercel since that's where
the client's project already lives.

- **`src/vercelHandler.ts`** is the source for Vercel's entrypoint (their
  serverless-function convention: a default `(req, res)` handler). It
  never calls `app.listen()` — Vercel owns the HTTP listening — and shares
  `buildApiApp()` with `server.ts` so the two entrypoints can't drift on
  which adapters get used.
- **It gets bundled, not deployed as-is** — the `vercel-build` script runs
  esbuild against it, producing `api/index.js`, the file Vercel's
  serverless-function convention actually picks up. `vercel.json`'s
  rewrite sends every path to `/api/index` (the file-path route — not
  relying on "index" collapsing to `/api`), since this API has no `/api`
  prefix convention of its own.
- **`api/index.js` is committed, not gitignored**, even though it's a
  generated build artifact. Belt-and-suspenders on purpose: relying solely
  on Vercel actually invoking `vercel-build` at deploy time turned out to
  be a real single point of failure in production — when it silently
  didn't run (or wasn't invoked the way expected), the whole deployment
  fell back to serving `public/index.html` for every path (even `POST`
  requests got a static file server's `405`, since no function existed at
  all) with no error to indicate why. `vercel.json`'s explicit
  `"buildCommand": "npm run vercel-build"` now removes the ambiguity
  going forward, but the committed file means the function exists even if
  that command is ever skipped. **This means it must be regenerated and
  re-committed after every change to `src/vercelHandler.ts` or anything it
  imports** — run `npm run vercel-build -w @nouveau/api` and commit the
  result alongside the source change; a stale committed bundle would
  silently deploy old behavior.
- **Why bundling is necessary at all** — two layered problems, in the
  order they were actually hit in production:
  1. Pointing Vercel at TypeScript source directly (`src/server.ts` or an
     unbundled `api/index.ts`) crashes at runtime with
     `ERR_MODULE_NOT_FOUND` on `./config/env` — Vercel's zero-config Node
     handling can transpile a source file one at a time without bundling,
     and Node's own ESM loader then can't resolve this codebase's
     extensionless relative imports.
  2. Even bundled by Vercel's own builder, `@nouveau/core`/`db`/`security`
     get left as external `node_modules` requires rather than inlined,
     since they're resolved as ordinary bare-specifier packages. Those
     packages have no compiled output — their `package.json` "main"
     points straight at TypeScript source — so at runtime Node fails with
     `Cannot find package '.../node_modules/@nouveau/db/src/index.ts'`.
  Both failures are invisible locally: `tsx` (dev) and `tsc --noEmit`
  both tolerate the same imports, and the test suite never runs the
  deployed artifact. Running our own esbuild bundle — with only genuine
  third-party npm packages (`express`, `mongoose`, `argon2`, etc.; see the
  `--external` flags in `package.json`) left unbundled — sidesteps both at
  once, since the output is one self-contained file with no remaining
  imports of anything that isn't a real, properly-published npm package.
  **Before trusting any change here, run `npm run vercel-build -w
  @nouveau/api` then `node scripts/smokeTestBundle.mjs`** (from
  `apps/api/`) and hit `http://localhost:4001/health` — this is the only
  way to catch a bundling regression before it reaches production, since
  none of the other test/build commands actually execute the deployed
  artifact.
- **`public/index.html`** is a trivial placeholder, not a real page — this
  is a functions-only API with no frontend of its own, but Vercel's build
  still expects a static output directory to exist and fails the whole
  build ("No Output Directory named 'public' found") without one.
  `vercel.json`'s `outputDirectory` points at it explicitly rather than
  relying on that being the right default. `vercel.json`'s rewrite still
  sends every real path to the API function first, so this file is never
  actually served except at a bare `/`.
- **Vercel project settings**: Root Directory `apps/api`, Framework Preset
  "Other". Required env vars: `MONGODB_URI` (a real MongoDB, e.g. Atlas —
  not the local dev one), `SESSION_SECRET` and `KMS_LOCAL_MASTER_KEY`
  (fresh random values, never reused from `.env`), `TRADING_MODE=paper`,
  and:
  - `CORS_ORIGIN=https://nouveau-marketing.vercel.app` — the real deployed
    frontend.
  - `COOKIE_SAME_SITE=none` — **required here, not optional.** `nouveau-api`
    and `nouveau-marketing` are two different Vercel *projects*, both on
    `*.vercel.app`. `vercel.app` is on the public suffix list specifically
    so that different customers' subdomains don't share cookies with each
    other, which means browsers treat these two as genuinely different
    sites, not just different subdomains of one site — the same as if they
    were on entirely unrelated domains. `COOKIE_SAME_SITE=lax` (the
    default, correct when a frontend and API share a real registrable
    domain like `app.example.com` + `api.example.com`) would silently
    drop the session cookie on every cross-project request here. See
    `config/env.ts` for the mechanics.
- **If this ever moves off Vercel** to a traditional host (Render,
  Railway, a VPS): `npm run build && npm start` (plain `tsc` +
  `node dist/server.js`) is untested end-to-end and has the exact second
  problem described above — `server.ts` would need the same esbuild
  bundling treatment `vercelHandler.ts` already gets (bundle `server.ts`
  itself, keep only real npm packages external, still call
  `app.listen()`) rather than a bare `tsc` build.

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
3. **The trader track (2026-09-28) is architecturally complete but running
   entirely on simulators** — real signals, real broker verification, and
   real billing all need a vendor relationship only the client can set up:
   - **MetaApi** (metaapi.cloud) for `MARKET_DATA_PROVIDER=metaapi` and
     `BROKER_LINK_PROVIDER=metaapi` — `MtAccount.metaApiId`/`copyFactoryId`
     already hint this was always the intended vendor, and the same token
     covers the investor track's copy-trading too. Set `META_API_TOKEN` in
     `.env` once the client has an account and token — never paste it into
     chat.
   - **A payment processor** for `PAYMENT_PROVIDER=real` —
     `@nouveau/core`'s `ledger.ts` already assumes Paystack in its own
     comments, so confirm that's still the intended processor before
     building `adapters/payment/`'s real implementation (client needs an
     account with payout banking set up, a recurring price for the
     `trader_monthly` plan, and real bank-transfer/card charge + payout
     capability for the investor track's `chargeDeposit`/`payOut` — the
     ledger and balance math behind `routes/ledger.ts` is already real and
     correct; only this vendor call is a stand-in).
   - Optional: `ANTHROPIC_API_KEY` for `LLM_NARRATION_PROVIDER=anthropic` —
     narration only, never the decision-maker; `computeSignal`'s
     deterministic bias stays the sole source of the buy/sell/hold call.
   - **Before real users see real signals**: get a compliance/legal read on
     whether live buy/sell/hold guidance needs licensing or specific
     disclaimer structuring in the client's jurisdiction —
     `services/signalDisclaimer.ts`'s text is a draft, not reviewed by
     counsel, same caveat as the LPOA text above.

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
