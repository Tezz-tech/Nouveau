import { type Cents, ZERO_CENTS, add, negate, sum, isZero, isPositive, splitByRatio, toDecimalString } from "./money";

/**
 * Every account is a bucket. A transaction only ever moves money between
 * buckets — it never creates or destroys it — which is what makes "entries
 * sum to zero" true by construction rather than by discipline.
 *
 * `external` and `market:pnl` are the two buckets that represent value
 * crossing this system's boundary: `external` for real cash (deposits in,
 * withdrawals out, subscription charges in) and `market:pnl` for trading
 * gains/losses recognized at settlement. Keeping them separate means the
 * nightly reconciler can check `external` against the bank statement and
 * `atrisk:*` + `market:pnl` against the broker's equity reports
 * independently, instead of one mixed number that hides which side broke.
 *
 * IMPORTANT — this package has no database. Nothing here enforces that a
 * transaction actually gets persisted atomically, or that concurrent writes
 * can't race. That is MongoDB-transaction-and-reconciler territory (Phase 3),
 * a deliberate trade-off documented in this package's README: we do not have
 * a database CHECK constraint backing this invariant, so the persistence
 * layer built on top of these functions MUST wrap every write in a session
 * transaction and MUST NOT skip `assertBalanced` before committing.
 */
export type AccountId = string;

export const accounts = {
  external: (): AccountId => "external",
  marketPnl: (): AccountId => "market:pnl",
  custody: (userId: string): AccountId => `custody:${userId}`,
  atRisk: (userId: string): AccountId => `atrisk:${userId}`,
  platformRevenue: (): AccountId => "platform:revenue",
  payoutPending: (userId: string): AccountId => `payout:${userId}`,
} as const;

export interface LedgerEntryInput {
  account: AccountId;
  amountCents: Cents;
}

export interface BalancedTransaction {
  kind: string;
  reference: string;
  entries: readonly LedgerEntryInput[];
}

export class UnbalancedTransactionError extends Error {
  constructor(entries: readonly LedgerEntryInput[], total: Cents) {
    super(
      `Ledger entries must sum to zero; got ${toDecimalString(total)} across ${entries.length} entries: ` +
        entries.map((e) => `${e.account}=${toDecimalString(e.amountCents)}`).join(", ")
    );
    this.name = "UnbalancedTransactionError";
  }
}

export function assertBalanced(entries: readonly LedgerEntryInput[]): void {
  const total = sum(entries.map((e) => e.amountCents));
  if (!isZero(total)) {
    throw new UnbalancedTransactionError(entries, total);
  }
}

/** The one place a `BalancedTransaction` gets constructed. Every builder
 *  below goes through this — there is no way to produce a `BalancedTransaction`
 *  value without passing this check. */
export function buildTransaction(
  kind: string,
  reference: string,
  entries: readonly LedgerEntryInput[]
): BalancedTransaction {
  if (entries.length < 2) {
    throw new RangeError("A ledger transaction needs at least two entries (double-entry, minimum one debit and one credit).");
  }
  assertBalanced(entries);
  return { kind, reference, entries };
}

function requirePositive(amount: Cents, label: string): void {
  if (!isPositive(amount)) {
    throw new RangeError(`${label} must be a positive amount; got ${toDecimalString(amount)}`);
  }
}

/**
 * The deposit split. This is the one function every deposit path must call —
 * it is where invariant #2 ("only the at-risk half enters MT5") is enforced
 * as a matter of arithmetic: there is no code path through this function
 * that produces an atRisk amount different from `depositAmount - custodyHalf`.
 *
 * ASSUMPTION FLAGGED: the brief's Phase 3 description ("write one transaction
 * with four entries — bank settlement out, platform revenue in, user custody
 * in, user at-risk in") reads as if a subscription fee is deducted from the
 * deposit itself in the same transaction. That contradicts the deposit being
 * a clean 50/50 split (custody + atRisk would then be less than half each of
 * the stated amount) and contradicts the marketing site's own copy ("the
 * subscription is billed separately... never used to cover it"). This
 * function assumes the brief meant TWO separate transactions — `deposit`
 * (this one, 3 entries: external, custody, atRisk) and `subscription` (see
 * below, 2 entries) — and that "four entries" was describing them narratively
 * bundled, not literally one transaction. Confirm before Phase 3 wires this
 * to a real deposit webhook.
 */
export function splitDeposit(userId: string, reference: string, depositAmount: Cents): BalancedTransaction {
  requirePositive(depositAmount, "depositAmount");
  const { first: custodyHalf, second: atRiskHalf } = splitByRatio(depositAmount, 1n, 2n);
  return buildTransaction("deposit", reference, [
    { account: accounts.external(), amountCents: negate(depositAmount) },
    { account: accounts.custody(userId), amountCents: custodyHalf },
    { account: accounts.atRisk(userId), amountCents: atRiskHalf },
  ]);
}

/** A cleared subscription charge (Paystack checkout), recognized as revenue
 *  immediately. Deliberately has no knowledge of any user's deposit. */
export function recognizeSubscriptionRevenue(reference: string, amount: Cents): BalancedTransaction {
  requirePositive(amount, "amount");
  return buildTransaction("subscription", reference, [
    { account: accounts.external(), amountCents: negate(amount) },
    { account: accounts.platformRevenue(), amountCents: amount },
  ]);
}

/**
 * Marks the at-risk bucket up or down to match a settled cycle's outcome.
 * `changeCents` is signed: positive for a gain (target hit), negative for a
 * loss (floor hit, down to and including total loss of the at-risk half).
 * The custody half is never an argument to this function — it cannot be
 * touched by a settlement, by construction.
 */
export function settleTradingOutcome(userId: string, reference: string, changeCents: Cents): BalancedTransaction {
  if (isZero(changeCents)) {
    throw new RangeError("settleTradingOutcome: changeCents must not be zero — a no-op settlement isn't a ledger event");
  }
  return buildTransaction("settlement", reference, [
    { account: accounts.marketPnl(), amountCents: negate(changeCents) },
    { account: accounts.atRisk(userId), amountCents: changeCents },
  ]);
}

/** The profit-split fee (REVENUE_MODEL = subscription_plus_split only),
 *  deducted from custody at settlement. Both accounts are internal — no
 *  `external` leg, because no real cash moves; this just re-labels part of
 *  the user's custody balance as recognized platform revenue. */
export function chargeSplitFee(userId: string, reference: string, feeAmount: Cents): BalancedTransaction {
  requirePositive(feeAmount, "feeAmount");
  return buildTransaction("split_fee", reference, [
    { account: accounts.custody(userId), amountCents: negate(feeAmount) },
    { account: accounts.platformRevenue(), amountCents: feeAmount },
  ]);
}

/** Step 1 of a withdrawal: move funds out of custody into a pending-payout
 *  holding bucket. Nothing here talks to Paystack — this only records intent
 *  against the ledger. */
export function requestWithdrawal(userId: string, reference: string, amount: Cents): BalancedTransaction {
  requirePositive(amount, "amount");
  return buildTransaction("withdrawal_requested", reference, [
    { account: accounts.custody(userId), amountCents: negate(amount) },
    { account: accounts.payoutPending(userId), amountCents: amount },
  ]);
}

/** Step 2 of a withdrawal: the Paystack Transfer actually completed and real
 *  money left the platform. Kept separate from step 1 so a failed transfer
 *  can be reversed (credit `payoutPending`, debit `custody`) without ever
 *  having claimed the money left the system. */
export function completeWithdrawal(userId: string, reference: string, amount: Cents): BalancedTransaction {
  requirePositive(amount, "amount");
  return buildTransaction("withdrawal_completed", reference, [
    { account: accounts.payoutPending(userId), amountCents: negate(amount) },
    { account: accounts.external(), amountCents: amount },
  ]);
}

/** Reverses a withdrawal request that failed before completion (e.g. the
 *  Paystack Transfer was rejected) — money goes back to custody. */
export function reverseWithdrawalRequest(userId: string, reference: string, amount: Cents): BalancedTransaction {
  requirePositive(amount, "amount");
  return buildTransaction("withdrawal_reversed", reference, [
    { account: accounts.payoutPending(userId), amountCents: negate(amount) },
    { account: accounts.custody(userId), amountCents: amount },
  ]);
}

/**
 * Applies a list of balanced transactions to a starting balance map and
 * returns the resulting balances. Pure — no persistence. Useful for tests
 * and for the reconciler to recompute "what the ledger says the balance
 * should be" from a transaction log.
 */
export function applyToBalances(
  startingBalances: ReadonlyMap<AccountId, Cents>,
  transactions: readonly BalancedTransaction[]
): Map<AccountId, Cents> {
  const balances = new Map(startingBalances);
  for (const txn of transactions) {
    for (const entry of txn.entries) {
      const current = balances.get(entry.account) ?? ZERO_CENTS;
      balances.set(entry.account, add(current, entry.amountCents));
    }
  }
  return balances;
}
