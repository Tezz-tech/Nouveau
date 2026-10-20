import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  cents,
  ZERO_CENTS,
  add,
  subtract,
  negate,
  abs,
  sum,
  isNegative,
  isPositive,
  isZero,
  compare,
  min,
  max,
  ratioOf,
  percentOf,
  half,
  splitByRatio,
  toDecimalString,
} from "./money";

const arbCents = fc.bigInt({ min: -1_000_000_000n, max: 1_000_000_000n }).map(cents);
const arbPositiveCents = fc.bigInt({ min: 0n, max: 1_000_000_000n }).map(cents);

describe("cents()", () => {
  it("accepts bigint, string, and safe integer number", () => {
    expect(cents(100n)).toBe(100n);
    expect(cents("100")).toBe(100n);
    expect(cents(100)).toBe(100n);
  });

  it("rejects non-integer numbers", () => {
    expect(() => cents(1.5)).toThrow(TypeError);
  });

  it("rejects unsafe integer numbers", () => {
    expect(() => cents(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});

describe("arithmetic", () => {
  it("add/subtract are inverses", () => {
    fc.assert(
      fc.property(arbCents, arbCents, (a, b) => {
        expect(subtract(add(a, b), b)).toBe(a);
      })
    );
  });

  it("negate is its own inverse", () => {
    fc.assert(
      fc.property(arbCents, (a) => {
        expect(negate(negate(a))).toBe(a);
      })
    );
  });

  it("abs is never negative", () => {
    fc.assert(
      fc.property(arbCents, (a) => {
        expect(isNegative(abs(a))).toBe(false);
      })
    );
  });

  it("sum of an empty array is zero", () => {
    expect(sum([])).toBe(ZERO_CENTS);
  });

  it("sum matches manual reduction", () => {
    fc.assert(
      fc.property(fc.array(arbCents, { maxLength: 20 }), (values) => {
        const manual = values.reduce((acc, v) => acc + v, 0n);
        expect(sum(values)).toBe(cents(manual));
      })
    );
  });
});

describe("predicates and comparison", () => {
  it("compare returns 0 for equal amounts", () => {
    expect(compare(cents(500n), cents(500n))).toBe(0);
    expect(compare(ZERO_CENTS, ZERO_CENTS)).toBe(0);
  });

  it("compare is consistent with numeric ordering", () => {
    fc.assert(
      fc.property(arbCents, arbCents, (a, b) => {
        const result = compare(a, b);
        if (a < b) expect(result).toBe(-1);
        else if (a > b) expect(result).toBe(1);
        else expect(result).toBe(0);
      })
    );
  });

  it("min/max pick the right value", () => {
    fc.assert(
      fc.property(arbCents, arbCents, (a, b) => {
        expect(min(a, b)).toBe(a < b ? a : b);
        expect(max(a, b)).toBe(a > b ? a : b);
      })
    );
  });

  it("isZero/isPositive/isNegative are mutually exclusive and exhaustive", () => {
    fc.assert(
      fc.property(arbCents, (a) => {
        const flags = [isZero(a), isPositive(a), isNegative(a)];
        expect(flags.filter(Boolean).length).toBe(1);
      })
    );
  });
});

describe("ratioOf", () => {
  it("throws on zero denominator", () => {
    expect(() => ratioOf(cents(100n), 1n, 0n)).toThrow(RangeError);
  });

  it("100% of an amount is the amount itself", () => {
    fc.assert(
      fc.property(arbCents, (a) => {
        expect(ratioOf(a, 1n, 1n)).toBe(a);
      })
    );
  });

  it("0% of anything is zero", () => {
    fc.assert(
      fc.property(arbCents, (a) => {
        expect(ratioOf(a, 0n, 1n)).toBe(ZERO_CENTS);
      })
    );
  });

  it("rounds half away from zero", () => {
    // 1 cent split into 2 halves -> 1 cent rounds up to 1 (0.5 rounds up)
    expect(ratioOf(cents(1n), 1n, 2n)).toBe(cents(1n));
    // 3 cents / 2 = 1.5 -> rounds to 2
    expect(ratioOf(cents(3n), 1n, 2n)).toBe(cents(2n));
    // negative: -3 / 2 = -1.5 -> rounds away from zero to -2
    expect(ratioOf(cents(-3n), 1n, 2n)).toBe(cents(-2n));
  });

  it("sign is correct for every combination of negative factors", () => {
    expect(isPositive(ratioOf(cents(100n), 1n, 2n))).toBe(true);
    expect(isNegative(ratioOf(cents(-100n), 1n, 2n))).toBe(true);
    expect(isNegative(ratioOf(cents(100n), -1n, 2n))).toBe(true);
    expect(isPositive(ratioOf(cents(-100n), -1n, 2n))).toBe(true);
    // a negative denominator is never used anywhere in this codebase today,
    // but the function must still behave correctly (not silently misbehave)
    // if one were ever passed
    expect(ratioOf(cents(100n), 1n, -2n)).toBe(cents(-50n));
    expect(ratioOf(cents(-100n), 1n, -2n)).toBe(cents(50n));
  });
});

describe("percentOf / half", () => {
  it("50% equals half", () => {
    fc.assert(
      fc.property(arbCents, (a) => {
        expect(percentOf(a, 50n)).toBe(half(a));
      })
    );
  });

  it("100% is identity, 0% is zero", () => {
    fc.assert(
      fc.property(arbCents, (a) => {
        expect(percentOf(a, 100n)).toBe(a);
        expect(percentOf(a, 0n)).toBe(ZERO_CENTS);
      })
    );
  });
});

describe("splitByRatio — the property that matters most for the ledger", () => {
  it("first + second always exactly equals the original amount, for every amount and every ratio", () => {
    fc.assert(
      fc.property(
        arbPositiveCents,
        fc.bigInt({ min: 1n, max: 99n }),
        (amount, numerator) => {
          const { first, second } = splitByRatio(amount, numerator, 100n);
          expect(add(first, second)).toBe(amount);
        }
      )
    );
  });

  it("splitting an odd amount in half never loses or invents a cent", () => {
    const { first, second } = splitByRatio(cents(2001n), 1n, 2n);
    expect(add(first, second)).toBe(cents(2001n));
    // one side gets the odd cent, not both, not neither
    expect(abs(subtract(first, second))).toBe(cents(1n));
  });

  it("splitting zero gives zero and zero", () => {
    const { first, second } = splitByRatio(ZERO_CENTS, 1n, 2n);
    expect(first).toBe(ZERO_CENTS);
    expect(second).toBe(ZERO_CENTS);
  });
});

describe("toDecimalString", () => {
  it("formats positive, negative, and zero correctly", () => {
    expect(toDecimalString(cents(1234n))).toBe("12.34");
    expect(toDecimalString(cents(-1234n))).toBe("-12.34");
    expect(toDecimalString(ZERO_CENTS)).toBe("0.00");
    expect(toDecimalString(cents(5n))).toBe("0.05");
    expect(toDecimalString(cents(-5n))).toBe("-0.05");
  });
});
