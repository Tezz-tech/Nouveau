/**
 * Plain technical indicators over closing prices. Deliberately framework-
 * free and side-effect-free, same discipline as money.ts/ledger.ts — these
 * are the actual decision-making math behind a trader's signal, so they
 * need to be exhaustively unit-testable, not an LLM guessing a direction.
 */

export function movingAverage(closes: readonly number[], period: number): number {
  if (period <= 0) throw new RangeError("period must be positive");
  if (closes.length < period) {
    throw new RangeError(`movingAverage needs at least ${period} closes, got ${closes.length}`);
  }
  const window = closes.slice(closes.length - period);
  return window.reduce((sum, v) => sum + v, 0) / period;
}

/** Standard Wilder-style RSI over the last `period` changes (so it needs
 *  `period + 1` closes). Returns 100 for an unbroken run of gains, 0 for an
 *  unbroken run of losses, and 50 when nothing moved at all. */
export function rsi(closes: readonly number[], period = 14): number {
  if (period <= 0) throw new RangeError("period must be positive");
  if (closes.length < period + 1) {
    throw new RangeError(`rsi needs at least ${period + 1} closes, got ${closes.length}`);
  }
  const window = closes.slice(closes.length - (period + 1));
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < window.length; i++) {
    const change = window[i]! - window[i - 1]!;
    if (change > 0) gains += change;
    else losses += -change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const relativeStrength = avgGain / avgLoss;
  return 100 - 100 / (1 + relativeStrength);
}

/** Percent change from `period` closes ago to the most recent close. */
export function momentum(closes: readonly number[], period: number): number {
  if (period <= 0) throw new RangeError("period must be positive");
  if (closes.length < period + 1) {
    throw new RangeError(`momentum needs at least ${period + 1} closes, got ${closes.length}`);
  }
  const past = closes[closes.length - 1 - period]!;
  const current = closes[closes.length - 1]!;
  if (past === 0) throw new RangeError("cannot compute momentum from a zero base price");
  return ((current - past) / past) * 100;
}
