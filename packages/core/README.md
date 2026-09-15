# @nouveau/core

Phase 1 of the Nouveau trading platform. Pure logic — the money type, the
double-entry ledger primitives, the three floor policies, the cycle state
machine, and the settlement calculator. Everything a real dollar amount ever
passes through before it touches a database, a broker, or a network call.

## What this package owns

- **`money.ts`** — `Cents`, a branded `bigint`. All arithmetic (add,
  subtract, ratio/percentage, splitting an amount in two) that money is
  allowed to go through anywhere in this codebase.
- **`ledger.ts`** — the account-bucket model and the builder functions that
  are the *only* way to construct a `BalancedTransaction`. Every builder
  goes through `assertBalanced`; there is no code path that produces an
  unbalanced transaction value.
- **`floor/`** — `fixed`, `floating`, `ratchet` floor policies behind one
  `FloorPolicy` interface, switchable via `getFloorPolicy(FLOOR_MODEL)`.
  Default is `ratchet`.
- **`revenue/`** — `subscription_only` and `subscription_plus_split` behind
  one `RevenueModelPolicy` interface, switchable via
  `getRevenuePolicy(REVENUE_MODEL)`. Default is `subscription_only`.
- **`cycle/`** — the `pending → active → closing → settled` (+ `halted`)
  state machine as an explicit, exhaustively-tested transition table, plus
  `calculateSettlement`, the pure function that turns a final equity reading
  into a target/floor outcome and the resulting custody/at-risk split.

## What this package must never do

- **No I/O.** No database client, no HTTP client, no filesystem, no clock
  (`Date.now()` doesn't appear here — timestamps are the caller's problem).
  If a function in this package needs to reach outside the process to do its
  job, it belongs in a service, not here.
- **No `number` for money, anywhere, ever.** `Cents` is the only
  representation. `cents()` rejects non-integer and unsafe-integer numbers
  at the boundary specifically so a stray `float` can't sneak in disguised
  as a plain integer literal that happens to work today.
- **No silent rounding that could create or destroy a cent.** Every split
  (`splitByRatio`, and everything built on it) computes one side by ratio
  and the other by subtraction from the total, specifically so the two
  sides always sum back to the original exactly — see the property tests in
  `money.test.ts` and `ledger.test.ts`.
- **No deciding which revenue model or floor model applies to a given
  user.** That's account-level configuration resolved by whatever calls
  this package. This package only guarantees that whichever one is chosen
  behaves correctly.
- **No opinion on persistence or concurrency.** `assertBalanced` throws in
  memory; it is not a database constraint. The service layer built on top of
  this package (Phase 3) is responsible for wrapping every ledger write in a
  transaction/session and never persisting an entry set that skipped this
  check — see the note in `ledger.ts` and the stack-decision memory entry
  for why that matters more than usual here (MongoDB, not Postgres, so there
  is no CHECK constraint backing this up at the database layer; the nightly
  reconciler is the safety net, not a replacement for calling this code
  correctly).

## Assumptions flagged, not silently absorbed

1. **"Equity" in the floor policies means total equity (custody + at-risk),
   not the at-risk sub-account alone.** See the comment in `floor/fixed.ts`
   for the reasoning — the alternative reading makes the `fixed` model
   trigger a floor hit on the first cent of drawdown, which can't be right.
2. **A deposit and a same-cycle subscription charge are modeled as two
   separate ledger transactions** (`splitDeposit`, 3 entries; and a
   `subscription`-kind transaction, 2 entries), not the brief's literal
   "one transaction with four entries." See the comment above
   `splitDeposit` in `ledger.ts`. A pure 50/50 deposit split and "the
   subscription is billed separately, never out of your deposit" (the
   marketing site's own promise) can't both be true if a subscription fee
   is deducted inside the deposit transaction itself.

Confirm both before Phase 3/4 build on top of this package.

## Resolved

- **The `subscription_plus_split` profit-split eligibility rule** ("profiled
  versus unprofiled users") — client confirmed 2026-09-15: there is no
  eligibility gate, every user is on `subscription_plus_split`.
  `DEFAULT_REVENUE_MODEL` reflects this. `subscription_only` stays
  implemented and exported (a future per-user override is one field away),
  it's just no longer anyone's default.

## Running the tests

```bash
npm test -w @nouveau/core          # single run
npm run test:watch -w @nouveau/core
npm run test:coverage -w @nouveau/core   # branch/function/line/statement thresholds at 95%
```
