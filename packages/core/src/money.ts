/**
 * Money is always an integer count of minor units (cents), always `bigint`.
 * Nothing in this file — or anywhere downstream that consumes `Cents` — may
 * touch `number` for an amount of money. A stray `float` here is how a cycle
 * ships an off-by-a-fraction-of-a-cent floor to a real user.
 */
export type Cents = bigint & { readonly __brand: "Cents" };

export function cents(value: bigint | number | string): Cents {
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new TypeError(
        `cents() received a non-integer number (${value}). Money is always an integer count of minor units — convert upstream, don't round here.`
      );
    }
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(
        `cents() received a number outside the safe integer range (${value}). Pass a bigint or string for amounts this large.`
      );
    }
  }
  return BigInt(value) as Cents;
}

export const ZERO_CENTS: Cents = cents(0n);

export function add(a: Cents, b: Cents): Cents {
  return cents(a + b);
}

export function subtract(a: Cents, b: Cents): Cents {
  return cents(a - b);
}

export function negate(a: Cents): Cents {
  return cents(-a);
}

export function abs(a: Cents): Cents {
  return a < ZERO_CENTS ? negate(a) : a;
}

export function sum(values: readonly Cents[]): Cents {
  return values.reduce<Cents>((acc, v) => add(acc, v), ZERO_CENTS);
}

export function isNegative(a: Cents): boolean {
  return a < ZERO_CENTS;
}

export function isPositive(a: Cents): boolean {
  return a > ZERO_CENTS;
}

export function isZero(a: Cents): boolean {
  return a === ZERO_CENTS;
}

export function compare(a: Cents, b: Cents): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function min(a: Cents, b: Cents): Cents {
  return a < b ? a : b;
}

export function max(a: Cents, b: Cents): Cents {
  return a > b ? a : b;
}

/**
 * `amount * numerator / denominator`, rounded half-away-from-zero, entirely
 * in bigint arithmetic. This is the only way a percentage/ratio of money may
 * ever be computed in this codebase — never `amount * 0.3`.
 */
export function ratioOf(amount: Cents, numerator: bigint, denominator: bigint): Cents {
  if (denominator === 0n) {
    throw new RangeError("ratioOf: denominator must not be zero");
  }
  const negativeResult = (amount < 0n) !== (numerator < 0n) !== (denominator < 0n);
  const absAmount = amount < 0n ? -amount : amount;
  const absNum = numerator < 0n ? -numerator : numerator;
  const absDen = denominator < 0n ? -denominator : denominator;

  const product = absAmount * absNum;
  const quotient = product / absDen;
  const remainder = product % absDen;
  const roundedUp = remainder * 2n >= absDen ? quotient + 1n : quotient;

  return cents(negativeResult ? -roundedUp : roundedUp);
}

/** `percentOf(amount, 30n)` == 30% of amount. Whole-number percentages only
 *  by design — every real percentage this system uses (50%, 30%) is a whole
 *  number, and restricting the type keeps a fractional percent from ever
 *  sneaking in as a float. */
export function percentOf(amount: Cents, wholePercent: bigint): Cents {
  return ratioOf(amount, wholePercent, 100n);
}

export function half(amount: Cents): Cents {
  return ratioOf(amount, 1n, 2n);
}

/**
 * Splits `amount` into two parts that sum back to exactly `amount`, computing
 * the first part by ratio and the second as "whatever remains." This is the
 * only safe way to split money in half (or any ratio) in cents — rounding
 * both halves independently can lose or invent a cent.
 */
export function splitByRatio(
  amount: Cents,
  numerator: bigint,
  denominator: bigint
): { first: Cents; second: Cents } {
  const first = ratioOf(amount, numerator, denominator);
  const second = subtract(amount, first);
  return { first, second };
}

/** Debug/log-friendly decimal string, e.g. cents(-1234n) -> "-12.34". Not for
 *  user-facing currency formatting (no locale, no currency symbol) — use this
 *  only in error messages, logs, and test assertions. */
export function toDecimalString(amount: Cents): string {
  const negative = amount < ZERO_CENTS;
  const absValue = negative ? -amount : amount;
  const wholePart = absValue / 100n;
  const fractionPart = (absValue % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${wholePart}.${fractionPart}`;
}
