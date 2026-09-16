# Nouveau — platform monorepo

Nouveau is an automated trading service. A deposit splits in two: half sits
in a segregated custody account, untouched by trading; half funds a
per-user MT5 sub-account, copy-traded from a master strategy via
CopyFactory. A cycle ends at a **target** (the at-risk half doubles) or a
**floor** (the at-risk half is exhausted) — either way the custody half is
structurally unreachable by trading, because it never enters MT5 in the
first place. Every design decision in this repo exists to keep that one
property true.

This repo holds the public marketing site plus everything behind the
login: the ledger, the broker integration, the user and admin dashboards,
and the services that run cycles.

## Stack

- **React 18 + TypeScript** on the frontend (plain client-side SPAs, not
  Next.js), **Vite** for the marketing site.
- **Node.js + Express** on the backend, **MongoDB** as the datastore.
- **npm workspaces** for the monorepo (not pnpm — see below).
- Shared logic lives in `packages/`, importable by any app or service.

**Stack deviates from the original system brief on purpose.** The brief's
own "Stack" section specified Next.js, Fastify, and Postgres+Prisma+
TimescaleDB. The product/architecture/phase content of that brief is
authoritative; its specific framework choices were overridden per standing
preference (React.js frontend, Node/Express/MongoDB backend — this is the
same override applied to the marketing site earlier, when it was still
Next.js in an even earlier draft). One piece of that trade-off is
significant enough to spell out here rather than leave buried in a memory
file: the brief's ledger invariant #5 asks for double-entry sums-to-zero
enforced *by a database constraint, not application logic alone* —
something Postgres does natively (a trigger/CHECK constraint) and MongoDB
doesn't have a direct equivalent for. The explicit, confirmed decision is
to accept that trade-off: ledger integrity is enforced in application code
(`packages/core`'s `assertBalanced`, called inside a MongoDB transaction/
session on every write) with the nightly reconciler (Phase 3) as the
safety net, not a schema-level guarantee. Anyone touching the ledger
persistence layer should read `packages/core/README.md` before assuming
the database will catch a mistake — it won't.

`pnpm` (the brief's package manager choice) was swapped for plain npm
workspaces — a tooling-only substitution with no correctness implications,
made to avoid adding a new global dependency for a monorepo feature npm
already provides.

## Repo layout

```
apps/
  marketing/       React + Vite — the ENTIRE frontend: public site, auth
                    (login/signup/password reset), and the onboarding
                    wizard all live here as one app. See "One frontend,
                    not several" below for why.
  api/              Express — auth, onboarding, REST. Deployed on Vercel
                    as a bundled serverless function; see apps/api/README.md.
services/           (Phase 5+) engine, allocator, marketdata, intel, reconciler — not yet built
packages/
  core/             Phase 1 — pure cycle/ledger/floor/revenue logic, zero I/O. See packages/core/README.md.
  security/         Argon2 password hashing, envelope encryption, tokens.
  db/               Mongoose schemas/models (User, MtAccount, etc.).
  ui/               (later) shared React components, if a second frontend app is ever justified — not yet built
```

### One frontend, not several

Early in Phase 2 this became a separate `apps/web` project for the
authenticated experience. That was a mistake, corrected once flagged: the
frontend is one app. `apps/marketing`'s existing `Login`/`Signup` pages
(originally visual-only placeholders) are now the real, functional ones,
wired to `apps/api`, alongside the onboarding wizard under
`/onboarding/*`. Don't split the frontend into a second app for a future
phase (a user dashboard, say) without a genuinely new reason to — the
default is one frontend folder.

## Getting started

```bash
npm install                              # installs and links every workspace
npm run dev -w @nouveau/marketing        # the whole frontend, http://localhost:5173
npm run dev -w @nouveau/api              # the API, http://localhost:4000 — needs a running MongoDB
npm test -w @nouveau/core                # Phase 1 logic tests
npm run test:coverage -w @nouveau/core   # with coverage thresholds
```

## Non-negotiable invariants

These come from the original system brief and apply across every phase,
regardless of stack. Violating any of these is a critical bug:

1. Custody is segregated — no code path moves custody funds into MT5, into
   operations, or into another user's withdrawal.
2. Only the at-risk half ever enters MT5.
3. Every trade carries a stop loss; the engine rejects and logs any order
   without one.
4. Money is integer minor units — `bigint` cents, never `float`/`number`.
5. Double-entry ledger, entries always sum to zero (see the MongoDB
   trade-off note above for how this is enforced here).
6. Every trading decision is logged with a written reason, including
   decisions not to trade.
7. Live trading is off by default (`TRADING_MODE=paper|live`, default
   `paper`).
8. The LLM never places trades — it compiles strategies into JSON and
   explains history; a deterministic engine executes.

## Status

- **Phase 1 (`packages/core`)** — done. Money type, ledger primitives, all
  three floor policies, both revenue models, the cycle state machine, and
  the settlement calculator, with property-based tests. See
  `packages/core/README.md` for what it owns and what it must never do.
- **Phase 2 (auth + onboarding)** — done. `packages/security` (Argon2,
  envelope encryption, tokens) and `packages/db` (Mongoose models) back
  `apps/api`'s signup/login/password-reset and the five-step onboarding
  wizard, all surfaced through `apps/marketing` (see "One frontend, not
  several" above). Deployed: `apps/api` on Vercel, `apps/marketing`
  wherever the public site was already hosted.
- Everything from Phase 3 on (ledger persistence, broker integration,
  dashboards, admin) — not started.

## A note on scope

This is a real-money financial system. Per the brief's own instruction,
assumptions here are treated as expensive: flagged and confirmed, not
silently absorbed. If you're picking this up in a new session, read
`packages/core/README.md`'s "Assumptions flagged" section before writing
Phase 2+ code that depends on it.
