import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { cents, ZERO_CENTS, add } from "../money";
import { subscriptionOnlyPolicy } from "./subscriptionOnly";
import { subscriptionPlusSplitPolicy } from "./subscriptionPlusSplit";
import { getRevenuePolicy, DEFAULT_REVENUE_MODEL } from "./index";

describe("subscriptionOnlyPolicy", () => {
  it("never charges a fee, regardless of profit", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 1_000_000n }).map(cents), fc.bigInt({ min: 0n, max: 1_000_000n }).map(cents), (hwm, equity) => {
        const result = subscriptionOnlyPolicy.calculateSplitFee({ currentEquityCents: equity, highWaterMarkCents: hwm });
        expect(result.feeCents).toBe(ZERO_CENTS);
      })
    );
  });

  it("still advances the high-water mark on a new high", () => {
    const result = subscriptionOnlyPolicy.calculateSplitFee({
      currentEquityCents: cents(15_000n),
      highWaterMarkCents: cents(10_000n),
    });
    expect(result.newHighWaterMarkCents).toBe(cents(15_000n));
  });

  it("never lowers the high-water mark", () => {
    const result = subscriptionOnlyPolicy.calculateSplitFee({
      currentEquityCents: cents(5_000n),
      highWaterMarkCents: cents(10_000n),
    });
    expect(result.newHighWaterMarkCents).toBe(cents(10_000n));
  });
});

describe("subscriptionPlusSplitPolicy", () => {
  it("charges exactly 30% of new profit above the high-water mark", () => {
    const result = subscriptionPlusSplitPolicy.calculateSplitFee({
      currentEquityCents: cents(20_000n),
      highWaterMarkCents: cents(10_000n),
    });
    // profit = 10,000; 30% = 3,000
    expect(result.feeCents).toBe(cents(3_000n));
    expect(result.newHighWaterMarkCents).toBe(cents(20_000n));
  });

  it("charges nothing when equity is at or below the high-water mark", () => {
    const atHwm = subscriptionPlusSplitPolicy.calculateSplitFee({
      currentEquityCents: cents(10_000n),
      highWaterMarkCents: cents(10_000n),
    });
    expect(atHwm.feeCents).toBe(ZERO_CENTS);

    const belowHwm = subscriptionPlusSplitPolicy.calculateSplitFee({
      currentEquityCents: cents(5_000n),
      highWaterMarkCents: cents(10_000n),
    });
    expect(belowHwm.feeCents).toBe(ZERO_CENTS);
    // high-water mark doesn't fall even though equity did
    expect(belowHwm.newHighWaterMarkCents).toBe(cents(10_000n));
  });

  it("the defining property: the high-water mark tracks the running maximum, so no fee is ever charged on a gain that's already been charged", () => {
    fc.assert(
      fc.property(
        fc.array(fc.bigInt({ min: -50_000n, max: 100_000n }).map(cents), { minLength: 1, maxLength: 15 }),
        (equityReadings) => {
          let hwm = cents(10_000n); // starting deposit-derived HWM
          let totalFees = ZERO_CENTS;

          for (const equity of equityReadings) {
            const result = subscriptionPlusSplitPolicy.calculateSplitFee({
              currentEquityCents: equity,
              highWaterMarkCents: hwm,
            });
            // every fee must be non-negative and computed against the CURRENT
            // (not stale) high-water mark, since we feed `hwm` back in each time
            totalFees = add(totalFees, result.feeCents);
            hwm = result.newHighWaterMarkCents;
          }

          // final high-water mark must equal the running maximum of every
          // equity reading ever seen (including the starting 10,000) — this
          // is exactly what makes re-charging the same gain impossible: the
          // next fee calculation always measures profit from this point on.
          const trueMax = equityReadings.reduce((m, e) => (e > m ? e : m), cents(10_000n));
          expect(hwm).toBe(trueMax);
          expect(totalFees >= ZERO_CENTS).toBe(true);
        }
      )
    );
  });
});

describe("getRevenuePolicy / registry", () => {
  it("resolves each model name correctly", () => {
    expect(getRevenuePolicy("subscription_only")).toBe(subscriptionOnlyPolicy);
    expect(getRevenuePolicy("subscription_plus_split")).toBe(subscriptionPlusSplitPolicy);
  });

  it("defaults to subscription_plus_split (client confirmed: no eligibility gate, every user gets the split model)", () => {
    expect(DEFAULT_REVENUE_MODEL).toBe("subscription_plus_split");
  });
});
