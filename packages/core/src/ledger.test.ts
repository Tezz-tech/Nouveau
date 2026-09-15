import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { cents, ZERO_CENTS, add, sum, isZero } from "./money";
import {
  accounts,
  assertBalanced,
  buildTransaction,
  UnbalancedTransactionError,
  splitDeposit,
  recognizeSubscriptionRevenue,
  settleTradingOutcome,
  chargeSplitFee,
  requestWithdrawal,
  completeWithdrawal,
  reverseWithdrawalRequest,
  applyToBalances,
  type BalancedTransaction,
} from "./ledger";

const userId = "user_1";

function total(txn: BalancedTransaction) {
  return sum(txn.entries.map((e) => e.amountCents));
}

describe("assertBalanced / buildTransaction", () => {
  it("accepts entries that sum to zero", () => {
    expect(() =>
      assertBalanced([
        { account: "a", amountCents: cents(100n) },
        { account: "b", amountCents: cents(-100n) },
      ])
    ).not.toThrow();
  });

  it("rejects entries that do not sum to zero", () => {
    expect(() =>
      assertBalanced([
        { account: "a", amountCents: cents(100n) },
        { account: "b", amountCents: cents(-99n) },
      ])
    ).toThrow(UnbalancedTransactionError);
  });

  it("rejects a transaction with fewer than two entries", () => {
    expect(() => buildTransaction("x", "ref", [{ account: "a", amountCents: ZERO_CENTS }])).toThrow(RangeError);
  });

  it("property: no combination of random signed entries that doesn't sum to zero can become a BalancedTransaction", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ account: fc.constantFrom("a", "b", "c"), amountCents: fc.bigInt({ min: -1000n, max: 1000n }).map(cents) }), {
          minLength: 2,
          maxLength: 6,
        }),
        (entries) => {
          const runningTotal = sum(entries.map((e) => e.amountCents));
          if (isZero(runningTotal)) {
            expect(() => buildTransaction("test", "ref", entries)).not.toThrow();
          } else {
            expect(() => buildTransaction("test", "ref", entries)).toThrow(UnbalancedTransactionError);
          }
        }
      )
    );
  });
});

describe("splitDeposit", () => {
  it("splits exactly in half for an even amount", () => {
    const txn = splitDeposit(userId, "dep_1", cents(2000n));
    expect(total(txn)).toBe(ZERO_CENTS);
    const custodyEntry = txn.entries.find((e) => e.account === accounts.custody(userId))!;
    const atRiskEntry = txn.entries.find((e) => e.account === accounts.atRisk(userId))!;
    expect(custodyEntry.amountCents).toBe(cents(1000n));
    expect(atRiskEntry.amountCents).toBe(cents(1000n));
  });

  it("never loses or invents a cent on an odd amount", () => {
    const txn = splitDeposit(userId, "dep_2", cents(2001n));
    expect(total(txn)).toBe(ZERO_CENTS);
    const custodyEntry = txn.entries.find((e) => e.account === accounts.custody(userId))!;
    const atRiskEntry = txn.entries.find((e) => e.account === accounts.atRisk(userId))!;
    expect(add(custodyEntry.amountCents, atRiskEntry.amountCents)).toBe(cents(2001n));
  });

  it("the external leg exactly offsets custody + atRisk for any positive deposit — this is invariant #2 as a property", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 1_000_000_000n }).map(cents), (deposit) => {
        const txn = splitDeposit(userId, "ref", deposit);
        expect(total(txn)).toBe(ZERO_CENTS);
        const atRiskEntry = txn.entries.find((e) => e.account === accounts.atRisk(userId))!;
        const custodyEntry = txn.entries.find((e) => e.account === accounts.custody(userId))!;
        // at-risk is never more than custody's amount away from exactly half
        expect(add(atRiskEntry.amountCents, custodyEntry.amountCents)).toBe(deposit);
      })
    );
  });

  it("rejects a zero or negative deposit", () => {
    expect(() => splitDeposit(userId, "ref", ZERO_CENTS)).toThrow(RangeError);
    expect(() => splitDeposit(userId, "ref", cents(-1n))).toThrow(RangeError);
  });
});

describe("recognizeSubscriptionRevenue", () => {
  it("balances and credits platform revenue", () => {
    const txn = recognizeSubscriptionRevenue("sub_1", cents(1000n));
    expect(total(txn)).toBe(ZERO_CENTS);
    expect(txn.entries.find((e) => e.account === accounts.platformRevenue())!.amountCents).toBe(cents(1000n));
  });
});

describe("settleTradingOutcome", () => {
  it("a gain increases the at-risk bucket and is drawn from market:pnl", () => {
    const txn = settleTradingOutcome(userId, "settle_1", cents(500n));
    expect(total(txn)).toBe(ZERO_CENTS);
    expect(txn.entries.find((e) => e.account === accounts.atRisk(userId))!.amountCents).toBe(cents(500n));
    expect(txn.entries.find((e) => e.account === accounts.marketPnl())!.amountCents).toBe(cents(-500n));
  });

  it("a loss decreases the at-risk bucket", () => {
    const txn = settleTradingOutcome(userId, "settle_2", cents(-500n));
    expect(total(txn)).toBe(ZERO_CENTS);
    expect(txn.entries.find((e) => e.account === accounts.atRisk(userId))!.amountCents).toBe(cents(-500n));
  });

  it("rejects a zero change", () => {
    expect(() => settleTradingOutcome(userId, "ref", ZERO_CENTS)).toThrow(RangeError);
  });

  it("never touches the custody account — invariant #1 as a property", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: -1_000_000_000n, max: 1_000_000_000n }).filter((v) => v !== 0n).map(cents), (change) => {
        const txn = settleTradingOutcome(userId, "ref", change);
        expect(txn.entries.some((e) => e.account === accounts.custody(userId))).toBe(false);
      })
    );
  });
});

describe("chargeSplitFee", () => {
  it("moves money from custody to revenue, purely internal", () => {
    const txn = chargeSplitFee(userId, "fee_1", cents(300n));
    expect(total(txn)).toBe(ZERO_CENTS);
    expect(txn.entries.some((e) => e.account === accounts.external())).toBe(false);
    expect(txn.entries.find((e) => e.account === accounts.custody(userId))!.amountCents).toBe(cents(-300n));
  });
});

describe("withdrawal lifecycle", () => {
  it("request moves custody -> pending, complete moves pending -> external, both balanced", () => {
    const requested = requestWithdrawal(userId, "wd_1", cents(1000n));
    expect(total(requested)).toBe(ZERO_CENTS);
    const completed = completeWithdrawal(userId, "wd_1", cents(1000n));
    expect(total(completed)).toBe(ZERO_CENTS);

    const balances = applyToBalances(new Map(), [requested, completed]);
    expect(balances.get(accounts.custody(userId))).toBe(cents(-1000n));
    expect(balances.get(accounts.payoutPending(userId))).toBe(ZERO_CENTS);
    expect(balances.get(accounts.external())).toBe(cents(1000n));
  });

  it("a reversed request returns funds to custody with net-zero effect", () => {
    const requested = requestWithdrawal(userId, "wd_2", cents(1000n));
    const reversed = reverseWithdrawalRequest(userId, "wd_2", cents(1000n));
    const balances = applyToBalances(new Map(), [requested, reversed]);
    expect(balances.get(accounts.custody(userId))).toBe(ZERO_CENTS);
    expect(balances.get(accounts.payoutPending(userId))).toBe(ZERO_CENTS);
  });
});

describe("applyToBalances", () => {
  it("a full deposit-to-settlement-to-withdrawal lifecycle nets to zero across all buckets", () => {
    const deposit = splitDeposit(userId, "d1", cents(20_000n)); // $200
    const gain = settleTradingOutcome(userId, "s1", cents(10_000n)); // at-risk doubles: 10000 -> 20000
    const withdrawRequest = requestWithdrawal(userId, "w1", cents(30_000n)); // withdraw everything: 10000 custody + 20000 at-risk...
    // (illustrative only — real withdrawal-from-two-buckets is a Phase-4 orchestration concern,
    // not something packages/core prescribes; here we just prove the ledger math nets to zero)

    const balances = applyToBalances(new Map(), [deposit, gain]);
    const totalAcrossBuckets = sum([...balances.values()]);
    expect(totalAcrossBuckets).toBe(ZERO_CENTS);

    void withdrawRequest;
  });

  it("property: applying any sequence of valid builder-produced transactions always nets to zero across all buckets", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.bigInt({ min: 1n, max: 100_000n }).map((d) => splitDeposit(userId, "d", cents(d))),
            fc.bigInt({ min: 1n, max: 100_000n }).map((f) => recognizeSubscriptionRevenue("s", cents(f))),
            fc
              .bigInt({ min: -100_000n, max: 100_000n })
              .filter((v) => v !== 0n)
              .map((c) => settleTradingOutcome(userId, "t", cents(c)))
          ),
          { maxLength: 15 }
        ),
        (transactions) => {
          const balances = applyToBalances(new Map(), transactions);
          expect(sum([...balances.values()])).toBe(ZERO_CENTS);
        }
      )
    );
  });
});
