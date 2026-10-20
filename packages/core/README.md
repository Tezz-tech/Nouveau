# @nouveau/core

Pure, framework-free logic shared across the monorepo — currently just the
money primitive (`src/money.ts`): `Cents`, a branded `bigint`, and the
arithmetic helpers around it. Money is always an integer count of minor
units, always `bigint` — nothing here or downstream may touch `number` for
an amount of money.

The old cycle/floor/revenue/ledger/onboarding/signals modules that used to
live here were deleted on 2026-10-20 along with the rest of the
pre-copy-trading architecture (see the root README) — they were specific to
the old Nouveau-custody product, not generically reusable. `money.ts`
survived the reset because it isn't.
