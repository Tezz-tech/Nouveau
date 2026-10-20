# Nouveau — platform monorepo

Nouveau is an automated trading service. This repo currently holds the
**public marketing site only**. Everything that used to live behind
login — auth, onboarding, the user dashboard, the Express API, and the
`packages/core`/`db`/`security` packages that backed them — was removed on
2026-10-20 to make way for a new architecture pattern. The pre-removal
state is fully preserved in git history, tagged `pre-reset-2026-10-20`, if
anything needs to be referenced or recovered.

## Stack

- **React 18 + TypeScript**, **Vite**, plain client-side SPA (not Next.js) —
  `apps/marketing`.
- **npm workspaces** for the monorepo.
- Whatever backs the authenticated product (API, database, shared logic)
  is being rebuilt from scratch — see "Status" below.

## Repo layout

```
apps/
  marketing/       React + Vite — the public site: Home, Services, About,
                    Support. No auth, no dashboard, no onboarding right now.
```

## Getting started

```bash
npm install
npm run dev -w @nouveau/marketing     # http://localhost:5173
```

## Non-negotiable invariants

These come from the original system brief and apply regardless of stack —
carried forward into whatever architecture replaces the removed backend:

1. Custody is segregated — no code path moves custody funds into trading,
   into operations, or into another user's withdrawal.
2. Only the at-risk half of a deposit ever enters live trading.
3. Every trade carries a stop loss; the engine rejects and logs any order
   without one.
4. Money is integer minor units — `bigint` cents, never `float`/`number`.
5. Double-entry ledger, entries always sum to zero.
6. Every trading decision is logged with a written reason, including
   decisions not to trade.
7. Live trading is off by default; a paper/simulated mode is the default
   until explicitly flipped.
8. The LLM, if one is involved, never places trades — it may compile
   strategy or explain history; a deterministic engine executes.

## Status

- **Marketing site** — intact, untouched by the 2026-10-20 removal.
- **Everything behind login** — removed 2026-10-20, pending a new pattern
  to be defined before rebuilding.

## A note on scope

This is a real-money financial system. Assumptions should be treated as
expensive: flagged and confirmed, not silently absorbed.
