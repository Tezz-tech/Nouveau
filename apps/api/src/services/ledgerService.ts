import { randomUUID } from "node:crypto";
import { LedgerTransaction, type UserDocument } from "@nouveau/db";
import {
  accounts,
  cents,
  add,
  ZERO_CENTS,
  splitDeposit,
  requestWithdrawal,
  completeWithdrawal,
  computeTarget,
  toDecimalString,
  type Cents,
  type BalancedTransaction,
} from "@nouveau/core";
import { HttpError } from "../middleware/errorHandler";
import type { PaymentAdapter } from "../adapters/payment/PaymentAdapter";

async function persist(userId: string, txn: BalancedTransaction, displayAmountCents: Cents, description: string): Promise<void> {
  await LedgerTransaction.create({
    userId,
    kind: txn.kind,
    reference: txn.reference,
    entries: txn.entries.map((e) => ({ account: e.account, amountCents: e.amountCents.toString() })),
    displayAmountCents: displayAmountCents.toString(),
    description,
  });
}

export interface EquityPoint {
  timestamp: string;
  totalEquityCents: Cents;
}

export interface Overview {
  custodyCents: Cents;
  atRiskCents: Cents;
  totalEquityCents: Cents;
  /** Sum of every deposit ever made — the baseline `targetCents` and a
   *  progress-to-target percentage are both measured from. */
  totalDepositedCents: Cents;
  /** `computeTarget` of `totalDepositedCents` — a simplified,
   *  single-running-cycle view. A user who deposits more than once doesn't
   *  get a fresh per-deposit cycle here; that needs the full cycle state
   *  machine in `@nouveau/core/cycle`, not wired up yet since there's no
   *  real trading outcome to ever settle against without a broker
   *  connection. Null until at least one deposit exists. */
  targetCents: Cents | null;
  /** Real running total-equity after every transaction, in chronological
   *  order — the dashboard's equity chart is this, not invented data. One
   *  point per ledger event, so a brand-new account has zero points and a
   *  single deposit has exactly one. */
  equitySeries: EquityPoint[];
}

/**
 * Every number shown to an investor is computed here, live, by replaying
 * their actual ledger transactions — never a stored "current balance"
 * field that could drift from the transaction history that's supposed to
 * explain it.
 */
export async function getOverview(userId: string): Promise<Overview> {
  const custodyAccount = accounts.custody(userId);
  const atRiskAccount = accounts.atRisk(userId);
  const docs = await LedgerTransaction.find({ userId }).sort({ createdAt: 1 });

  let custodyCents = ZERO_CENTS;
  let atRiskCents = ZERO_CENTS;
  let totalDeposited = ZERO_CENTS;
  const equitySeries: EquityPoint[] = [];

  for (const doc of docs) {
    for (const entry of doc.entries) {
      const amount = cents(entry.amountCents);
      if (entry.account === custodyAccount) custodyCents = add(custodyCents, amount);
      else if (entry.account === atRiskAccount) atRiskCents = add(atRiskCents, amount);
    }
    if (doc.kind === "deposit") {
      totalDeposited = add(totalDeposited, cents(doc.displayAmountCents));
    }
    equitySeries.push({
      timestamp: doc.get("createdAt").toISOString(),
      totalEquityCents: add(custodyCents, atRiskCents),
    });
  }

  return {
    custodyCents,
    atRiskCents,
    totalEquityCents: add(custodyCents, atRiskCents),
    totalDepositedCents: totalDeposited,
    targetCents: totalDeposited > ZERO_CENTS ? computeTarget(totalDeposited) : null,
    equitySeries,
  };
}

/**
 * Charges the payment adapter, then records the split via
 * `@nouveau/core`'s `splitDeposit` — invariant #2 (only the at-risk half
 * ever enters MT5) holds by construction here, same as everywhere else
 * this function is used. Investor-track only: a trader's money is never
 * held by Nouveau at all.
 */
export async function deposit(user: UserDocument, payment: PaymentAdapter, amountCents: Cents): Promise<Overview> {
  if (user.accountType !== "investor") {
    throw new HttpError(403, "Deposits are only available on the investor track.");
  }

  const chargeResult = await payment.chargeDeposit({ userId: user.id, amountCents: amountCents.toString() });
  if (!chargeResult.succeeded) {
    throw new HttpError(402, chargeResult.reason ?? "Payment failed.");
  }

  const txn = splitDeposit(user.id, chargeResult.providerReference, amountCents);
  await persist(user.id, txn, amountCents, `Deposit of $${toDecimalString(amountCents)}`);
  return getOverview(user.id);
}

/**
 * Two-step, same as `@nouveau/core`'s `requestWithdrawal`/`completeWithdrawal`
 * were designed for: move custody funds to a pending-payout bucket first,
 * only then ask the payment adapter to actually pay out. If the payout
 * step fails, the funds stay recorded as pending rather than silently
 * vanishing from the ledger — a real system would need a reconciliation/
 * retry path here, out of scope for a simulator that always succeeds.
 */
export async function withdraw(user: UserDocument, payment: PaymentAdapter, amountCents: Cents): Promise<Overview> {
  if (user.accountType !== "investor") {
    throw new HttpError(403, "Withdrawals are only available on the investor track.");
  }

  const overview = await getOverview(user.id);
  if (amountCents > overview.custodyCents) {
    throw new HttpError(422, "Withdrawal amount exceeds your available custody balance.");
  }

  const reference = `wd_${randomUUID()}`;
  const requestTxn = requestWithdrawal(user.id, reference, amountCents);
  await persist(user.id, requestTxn, amountCents, `Withdrawal requested: $${toDecimalString(amountCents)}`);

  const payoutResult = await payment.payOut({ userId: user.id, amountCents: amountCents.toString() });
  if (!payoutResult.succeeded) {
    throw new HttpError(502, payoutResult.reason ?? "Payout failed — your funds are held pending retry.");
  }

  const completeTxn = completeWithdrawal(user.id, `${reference}-complete`, amountCents);
  await persist(user.id, completeTxn, amountCents, `Withdrawal completed: $${toDecimalString(amountCents)}`);
  return getOverview(user.id);
}

export interface TransactionSummary {
  kind: string;
  reference: string;
  description: string;
  amountCents: string;
  createdAt: string;
}

export async function listTransactions(userId: string): Promise<TransactionSummary[]> {
  const docs = await LedgerTransaction.find({ userId }).sort({ createdAt: -1 });
  return docs.map((doc) => ({
    kind: doc.kind,
    reference: doc.reference,
    description: doc.description,
    amountCents: doc.displayAmountCents,
    createdAt: doc.get("createdAt").toISOString(),
  }));
}
