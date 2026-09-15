import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { cents, ZERO_CENTS, add } from "../money";
import { computeTarget, detectOutcome, calculateSettlement, SettlementNotReachedError } from "./settlement";
import { fixedFloorPolicy } from "../floor/fixed";

const deposit = cents(20_000n); // $200 -> custody 10,000, atRisk 10,000

describe("computeTarget", () => {
  it("is 1.5x the deposit (custody + doubled at-risk)", () => {
    expect(computeTarget(deposit)).toBe(cents(30_000n));
  });

  it("handles an odd deposit without losing a cent", () => {
    // deposit 2001 -> custody 1001 (rounds up), atRisk 1000 -> target = 1001 + 2000 = 3001
    expect(computeTarget(cents(2001n))).toBe(cents(3001n));
  });
});

describe("detectOutcome", () => {
  const floor = fixedFloorPolicy.initialFloor(deposit); // 10,000
  const target = computeTarget(deposit); // 30,000

  it("returns null while strictly between floor and target", () => {
    expect(detectOutcome(cents(20_000n), floor, target)).toBeNull();
  });

  it("returns target_hit at or above target", () => {
    expect(detectOutcome(target, floor, target)).toBe("target_hit");
    expect(detectOutcome(cents(50_000n), floor, target)).toBe("target_hit");
  });

  it("returns floor_hit at or below floor", () => {
    expect(detectOutcome(floor, floor, target)).toBe("floor_hit");
    expect(detectOutcome(ZERO_CENTS, floor, target)).toBe("floor_hit");
  });

  it("target takes precedence if a reading somehow satisfies both", () => {
    // pathological config where floor >= target — target must still win
    expect(detectOutcome(cents(100_000n), cents(90_000n), cents(80_000n))).toBe("target_hit");
  });
});

describe("calculateSettlement", () => {
  const floor = fixedFloorPolicy.initialFloor(deposit);
  const target = computeTarget(deposit);

  it("throws if neither floor nor target has been reached", () => {
    expect(() =>
      calculateSettlement({ depositCents: deposit, finalTotalEquityCents: cents(20_000n), floorCents: floor, targetCents: target })
    ).toThrow(SettlementNotReachedError);
  });

  it("target hit: custody untouched, at-risk doubled", () => {
    const result = calculateSettlement({
      depositCents: deposit,
      finalTotalEquityCents: target, // 30,000
      floorCents: floor,
      targetCents: target,
    });
    expect(result.outcome).toBe("target_hit");
    expect(result.custodyCents).toBe(cents(10_000n));
    expect(result.initialAtRiskCents).toBe(cents(10_000n));
    expect(result.finalAtRiskCents).toBe(cents(20_000n)); // doubled
    expect(result.atRiskChangeCents).toBe(cents(10_000n)); // grew by exactly the initial at-risk amount
    expect(result.totalPayoutCents).toBe(cents(30_000n));
  });

  it("floor hit: at-risk exhausted, custody untouched and fully preserved", () => {
    const result = calculateSettlement({
      depositCents: deposit,
      finalTotalEquityCents: cents(10_000n), // exactly custody, at-risk = 0
      floorCents: floor,
      targetCents: target,
    });
    expect(result.outcome).toBe("floor_hit");
    expect(result.custodyCents).toBe(cents(10_000n));
    expect(result.finalAtRiskCents).toBe(ZERO_CENTS);
    expect(result.atRiskChangeCents).toBe(cents(-10_000n)); // lost the entire at-risk half
    expect(result.totalPayoutCents).toBe(cents(10_000n)); // user keeps exactly the custody half — the $50->$25 promise
  });

  it("throws rather than silently clamping if the derived at-risk equity would be negative", () => {
    // floor must actually be reached (5,000 <= 6,000) for the function to
    // proceed to the settlement calculation at all; 5,000 is also below
    // custody (10,000), which is the impossible state under test.
    expect(() =>
      calculateSettlement({
        depositCents: deposit,
        finalTotalEquityCents: cents(5_000n),
        floorCents: cents(6_000n),
        targetCents: target,
      })
    ).toThrow(RangeError);
  });

  it("custody is never a function of the final equity reading — property check across many outcomes", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 1_000_000n }).map(cents), (dep) => {
        const f = fixedFloorPolicy.initialFloor(dep);
        const t = computeTarget(dep);
        const expectedCustody = f; // fixed floor == custody, by construction

        const targetResult = calculateSettlement({ depositCents: dep, finalTotalEquityCents: t, floorCents: f, targetCents: t });
        const floorResult = calculateSettlement({ depositCents: dep, finalTotalEquityCents: f, floorCents: f, targetCents: t });

        expect(targetResult.custodyCents).toBe(expectedCustody);
        expect(floorResult.custodyCents).toBe(expectedCustody);
        expect(targetResult.custodyCents).toBe(floorResult.custodyCents);
      })
    );
  });

  it("property: total payout always equals custody + finalAtRisk, exactly", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 100n, max: 1_000_000n }).map(cents), (dep) => {
        const f = fixedFloorPolicy.initialFloor(dep);
        const t = computeTarget(dep);
        const result = calculateSettlement({ depositCents: dep, finalTotalEquityCents: t, floorCents: f, targetCents: t });
        expect(add(result.custodyCents, result.finalAtRiskCents)).toBe(result.totalPayoutCents);
      })
    );
  });
});
