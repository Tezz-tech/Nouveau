# Nouveau — platform monorepo

Nouveau is a copy-trading platform. A user picks a "bot" (a plan tied to a
real master MT5 account — bot automation/training is explicitly future
scope), pays via Paystack, links their own existing MT5 account through a
hand-held wizard, and from then on MetaApi's CopyFactory copies every trade
from their chosen master account onto their account automatically.
**Nouveau never takes custody of a user's funds** — unlike the prior
architecture (preserved in git history at tag `pre-reset-2026-10-20`, fully
unrelated to this one), there is no deposit, no ledger, no segregated
custody account. The user's money stays on their own broker account the
whole time; Nouveau's role is linking and copying, not holding funds.

## Stack

- **React 18 + TypeScript + Vite**, plain client-side SPA — `apps/marketing`
  (the entire frontend: public site, auth, onboarding, dashboard).
- **Node.js + Express + MongoDB** — `apps/api`.
- **`metaapi.cloud-sdk` + `metaapi.cloud-copyfactory-sdk`** for real MT5
  account linking and trade copying; **Paystack** (raw REST, no SDK) for
  payment. No simulator for either — see `apps/api/README.md`.
- **npm workspaces** for the monorepo; shared logic in `packages/`.

## Repo layout

```
apps/
  marketing/       React + Vite — public site, auth, onboarding, dashboard.
  api/             Express — auth, bot checkout, MT5 linking, CopyFactory.
                    Deployed on Vercel as a bundled serverless function.
packages/
  core/            Just the money primitive (Cents/bigint) — see its README.
  security/        Argon2 password hashing, envelope encryption, tokens.
  db/              Mongoose schemas/models (User, MasterStrategy, BotPlan,
                    MtAccount, BotSubscription).
```

## Getting started

```bash
npm install
npm run dev -w @nouveau/marketing     # http://localhost:5173
npm run dev -w @nouveau/api           # http://localhost:4000 — needs MongoDB; META_API_TOKEN/PAYSTACK_SECRET_KEY optional (auth/bots/dashboard work without them, checkout/linking need them)
npm test -w @nouveau/api              # integration tests against fakes, no real credentials needed
```

## Non-negotiable invariants

1. Nouveau never takes custody of a user's funds — their money stays on
   their own linked broker account at all times.
2. A user's MT5 credential is always real and trading-capable (not a
   read-only investor password) — CopyFactory places real orders with it,
   so this is never pretended to be anything less than that, in code or in
   onboarding copy.
3. No simulator for MetaApi/CopyFactory or Paystack in production — a
   deliberate choice, since there's no meaningful "fake" version of either.
4. Every linked account's consent (that trades will be placed
   automatically) is explicitly recorded, not assumed.
5. Money is a decimal-string bigint (`@nouveau/core`'s `Cents`), never a
   native numeric type, anywhere pricing is stored.

## Status

- **Marketing site** — intact throughout.
- **Auth, onboarding, dashboard, and the copy-trading backend** — rebuilt
  2026-10-20/21 around MetaApi + Paystack. Architecturally real end to end
  (29 passing integration tests cover the full signup→pay→link→copy
  path); not yet exercised against live vendor credentials — see
  `apps/api/README.md`'s "Assumptions flagged" for exactly what's needed.
- **Admin UI** (2026-10-28, `/admin/*`) — link bots to master accounts
  and monitor user/subscription/linking activity. Gated by `User.role`,
  which has no public path to `"admin"` — see `apps/api/scripts/
  promoteAdmin.ts`. `scripts/seedMasterStrategies.ts` still exists for
  bulk/offline setup.

## A note on scope

This is a real-money-adjacent financial system (it never holds funds, but
it does authorize automated trading on a user's own account). Assumptions
should be treated as expensive: flagged and confirmed, not silently
absorbed.
