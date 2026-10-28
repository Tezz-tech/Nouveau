# @nouveau/api

The backend for Nouveau's copy-trading platform. A user picks a "bot" (a
plan tied to a master MT5 account traded by a real person — bot
training/automation is explicitly future scope), pays via Paystack, links
their own existing MT5 account through a hand-held wizard, and from then on
every trade placed on their chosen master account is copied onto their
account automatically by MetaApi's CopyFactory. This is a from-scratch
rebuild (2026-10-20) — the prior investor/trader-dual-track, Nouveau-custody
architecture is preserved in git history at tag `pre-reset-2026-10-20` but
has nothing to do with this one.

## Stack

- **Node.js + Express**, **MongoDB** (via `@nouveau/db`).
- **`metaapi.cloud-sdk`** for MT5 account provisioning, **`metaapi.cloud-copyfactory-sdk`** for strategy/subscriber management — both official vendor SDKs, imported via their `/node` subpath (see "MetaApi/CopyFactory packaging gotchas" below for two real bugs this surfaced).
- **Paystack**, talked to directly over `fetch` (no SDK — see `adapters/payment/PaystackPaymentAdapter.ts`).
- **No simulator for either integration.** Unlike every other vendor integration this project has ever built, there is no `*_PROVIDER=simulator` toggle for MetaApi/CopyFactory or Paystack — a deliberate client choice, since there's no meaningful "fake" version of copy trading or of charging real money for it. That choice is scoped to the copy-trading mechanics themselves, not the whole server: `META_API_TOKEN`/`PAYSTACK_SECRET_KEY` are `.optional()` in `config/env.ts` on purpose (an earlier version required them unconditionally, which meant a missing token crashed the *entire* server at boot — login, signup, everything, not just checkout/linking — a real incident, not a hypothetical). `adapters/copyTrading/provider.ts` and `adapters/payment/provider.ts` return a `NotConfigured*Adapter` when the matching token is absent; its methods throw a clear 503 only when a request genuinely needs the real vendor call. Automated tests inject `test/fakes/FakeCopyTradingAdapter`/`FakePaymentAdapter` directly via dependency injection instead of either of these.

## Environment

Copy `.env.example` to `.env`. `SESSION_SECRET`/`KMS_LOCAL_MASTER_KEY` need
real random values — the server won't boot without those. `META_API_TOKEN`
and `PAYSTACK_SECRET_KEY` are optional for booting (auth, the bot list, and
browsing the dashboard all work without them) but required for anything
that actually touches MetaApi or Paystack — checkout and MT5 linking will
respond with a clear 503 until real values are set. Local/manual testing
of those two flows specifically needs real sandbox credentials (a MetaApi
account + token, Paystack test-mode keys). Never paste either into chat —
only into `.env`.

## Running

```bash
npm run dev -w @nouveau/api     # tsx watch — needs a running MongoDB at MONGODB_URI
npm test -w @nouveau/api        # integration tests against mongodb-memory-server + fake adapters, no real credentials needed
```

## Data model (`@nouveau/db`)

- **`User.role`** — `"user"` (default) or `"admin"`. No API endpoint or UI
  flow can set this — see "Admin" below.
- **`MasterStrategy`** — one per bot. Created via `/admin/master-strategies`
  (the normal path now) or `scripts/seedMasterStrategies.ts` (still useful
  for bulk/offline setup). A master account's own MT5 credentials are used
  once at creation time and never persisted anywhere.
- **`BotPlan`** — a purchasable plan tied to one `MasterStrategy`.
  `priceCents` is a decimal string (this codebase's established money
  convention — see `@nouveau/core`'s `Cents`/`cents()`), never a native
  numeric type.
- **`MtAccount`** — a user's own linked MT5 account. `credentialRef` is
  always a real, **trading-capable** password, not a read-only one —
  CopyFactory places real orders on this account, which is a genuine
  consent/liability escalation from how earlier versions of this project
  handled broker credentials. `consent` records that this was explained
  and accepted at linking time. `connectionStage` is finer-grained than
  `status`, specifically so the linking wizard's poll endpoint has
  something honest to show while MetaApi deploys/connects the account.
- **`BotSubscription`** — append-only (same discipline this codebase
  already used for the old `LedgerTransaction`): switching bots marks the
  old row `superseded` and inserts a new one, never mutates in place.
  `mtAccountId` is nullable until linking completes —
  `status: "awaiting_link"` is a real, queryable state for "paid but not
  yet connected," not an edge case.

## How linking + copying actually works

1. `POST /subscription/checkout` initializes a Paystack transaction for a
   chosen `BotPlan` and returns an `authorizationUrl` to redirect to. No
   `BotSubscription` row exists yet.
2. Paystack confirms payment via `POST /webhooks/paystack` (mounted
   **before** `express.json()` in `app.ts` — signature verification needs
   the exact raw request bytes). `botSubscriptionService.handlePaymentSucceeded`
   creates the `BotSubscription` row, idempotently (duplicate webhook
   delivery is expected, not exceptional). If the user already has a
   **connected** `MtAccount` (this is a bot *switch*, not a first
   purchase), the new CopyFactory subscription is applied immediately —
   no re-linking needed, confirmed this is how CopyFactory is meant to be
   used.
3. `POST /mt-account/link` creates the `MtAccount`, records consent, and
   kicks off MetaApi account creation+deployment — **without waiting** for
   it to finish connecting (a serverless function's execution limit is
   shorter than MetaApi's worst-case deploy+connect time). The frontend
   wizard polls `GET /mt-account/status` afterward; this state is
   server-side, so the wizard is resumable across a page refresh.
4. The first time a poll sees `connectionStage: "connected"`,
   `mtAccountService.syncConnectionStatus` applies the CopyFactory strategy
   subscription (`CopyTradingAdapter.subscribeToStrategy`) for whichever
   `BotSubscription` is waiting on this account — this is the one place
   that call ever fires for a newly-linked account.

Each master account is a CopyFactory *strategy* (`generateStrategyId` +
`updateStrategy`, keyed to that master's MetaApi account id with
`copyFactoryRoles: ['PROVIDER']`); each user's linked account is a
*subscriber* (`copyFactoryRoles: ['SUBSCRIBER']`, `updateSubscriber` with
the chosen `strategyId` + risk multiplier). Switching bots is just another
`updateSubscriber` call with a different `strategyId` — confirmed this is
exactly how CopyFactory is designed to be used, not a workaround.

## Admin

`User.role` is the only gate — `"admin"` has no public, self-serve path to
get there (no signup field, no API endpoint can set it). The only way:

```bash
npx tsx scripts/promoteAdmin.ts someone@example.com
```

run locally, by someone who already has direct database access. Every
`/admin/*` route sits behind `requireAuth` + `requireAdmin` (401 if not
logged in, 403 if logged in but not an admin).

- **`/admin/master-strategies`** — `GET` to list, `POST` to create.
  Creating takes either `existingMetaApiAccountId` (an account already set
  up directly in the MetaApi dashboard — finalizes the CopyFactory strategy
  immediately, fast, no deploy/connect wait) or the full
  `broker`/`login`/`serverName`/`tradingPassword` set (provisions a fresh
  MetaApi account — returns immediately with `status: "provisioning"`,
  same non-blocking discipline as user-facing linking;
  `GET /admin/master-strategies/:id/status` polls and finalizes once
  connected). `PATCH /:id/status` pauses/reactivates — not available while
  `provisioning`/`failed`.
- **`/admin/bot-plans`** — `GET` to list, `POST` to create (tied to a
  `MasterStrategy`), `PATCH /:id/status` to retire/reactivate. Deliberately
  no price-editing endpoint — see `adminBotPlanService.ts`'s own comment on
  why repricing a plan subscribers already bought is a hazard, not just an
  API-design choice.
- **`/admin/users`** — `GET`, paginated (50/page), one row per user: email,
  name, member-since, role, current bot + subscription status, linked MT5
  account + connection status. Read-only; batches its lookups (one query
  per collection, not one per user) since this is the one admin list
  expected to actually grow.

## MetaApi/CopyFactory packaging gotchas (read before touching the adapters)

Both found the hard way this build, both real, both silent in local dev —
confirmed only by actually running the bundled Vercel output, not by
`tsx`/`tsc` alone:

1. **The bare `"metaapi.cloud-sdk"`/`"metaapi.cloud-copyfactory-sdk"`
   imports resolve to a browser-targeted webpack bundle** (via each
   package's `"import"` export condition) that references `window`/`self`
   and crashes Node immediately with `window is not defined`. Fix: import
   from the `/node` subpath instead (each package's own documented escape
   hatch to its real Node build).
2. **Even via `/node`, a plain `import X from "pkg/node"` silently gives
   the wrong value under genuine native Node ESM** (as opposed to `tsx`,
   which resolves it correctly) — `X` ends up bound to the whole CJS
   `module.exports` object, one level short of the real class at
   `module.exports.default`, so `new X(...)` fails with `"X is not a
   constructor"`. This is invisible under `tsx watch` (its interop differs)
   and invisible to `tsc`/`vitest` (neither actually executes the bundled,
   externalized-import code path) — it only ever surfaces by running the
   real `npm run vercel-build` output. Fixed in
   `adapters/copyTrading/MetaApiCopyTradingAdapter.ts` via `createRequire`,
   which uses genuine CommonJS `require()` semantics and behaves
   identically (and correctly) in both `tsx` and the bundled/native-ESM
   case — verified directly against both packages before relying on it.
3. **esbuild's Vercel bundle breaks if either SDK isn't marked
   `--external`** — esbuild tries to inline each package's own internal
   webpack-bundled CJS output, which contains a `require()` pattern esbuild
   can't statically convert to ESM, failing with `Dynamic require of "X" is
   not supported`. Both packages (and their `/*` subpath forms) must stay
   in the `--external` flag list in `package.json`'s `vercel-build` script,
   the same way every other genuine third-party dependency already does.

**Before trusting any change to the copy-trading adapter**, run
`npm run vercel-build -w @nouveau/api` then `node scripts/smokeTestBundle.mjs`
(from `apps/api/`, with real-shaped env vars) and hit
`http://localhost:4001/health` — `tsc --noEmit` and `vitest` both pass
cleanly even when the bundle is completely broken, since neither one
actually executes it.

## Deploying

See `vercelHandler.ts`'s own doc comment and `scripts/smokeTestBundle.mjs`
for the Vercel bundling mechanics — unchanged from the prior architecture's
approach (`api/index.js` is committed, not gitignored; regenerate and
re-commit it after any change to `vercelHandler.ts` or anything it
imports).

## Assumptions flagged

1. **Lightweight identity capture only (`fullName`) — no KYC verification
   adapter this time.** Real compliance review may matter later given this
   now places real automated trades on a user's own account, but isn't
   built today.
2. **Master accounts are now admin-self-serve** (`/admin/master-strategies`,
   2026-10-28) — `scripts/seedMasterStrategies.ts` still exists for
   bulk/offline setup but is no longer the only path.
3. **A brand-new MetaApi provisioning profile only reaches "active" status
   once the broker's `servers.dat` (MT5) file is uploaded to it** — a
   manual, broker-specific step neither the linking flow nor the seed
   script can do on their own. Many common broker servers are already
   recognized by MetaApi without it; an obscure one will fail account
   creation with a real, surfaced error rather than a false success.
4. **Everything MetaApi/CopyFactory/Paystack-related is written against
   each SDK's/API's published types and docs, not yet exercised against a
   live account** — there are no real credentials configured anywhere yet.
   Treat the first real signup→pay→link→copy run, once real credentials
   exist, as the actual verification step.
