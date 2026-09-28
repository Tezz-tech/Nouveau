import { describe, it, expect } from "vitest";
import { movingAverage, rsi, momentum } from "./indicators";
import { computeSignal, MIN_CANDLES_FOR_SIGNAL } from "./computeSignal";
import type { Candle } from "./types";

function candleAt(close: number, index: number): Candle {
  return { timestamp: index, open: close, high: close, low: close, close };
}

describe("movingAverage", () => {
  it("averages the last `period` values only", () => {
    expect(movingAverage([1, 2, 3, 4, 5], 3)).toBeCloseTo((3 + 4 + 5) / 3);
  });

  it("throws when there isn't enough data", () => {
    expect(() => movingAverage([1, 2], 3)).toThrow(RangeError);
  });
});

describe("rsi", () => {
  it("is 100 for an unbroken run of gains", () => {
    const closes = Array.from({ length: 15 }, (_, i) => 100 + i);
    expect(rsi(closes, 14)).toBe(100);
  });

  it("is 0 for an unbroken run of losses", () => {
    const closes = Array.from({ length: 15 }, (_, i) => 100 - i);
    expect(rsi(closes, 14)).toBe(0);
  });

  it("is 50 when the price never moves", () => {
    const closes = Array.from({ length: 15 }, () => 100);
    expect(rsi(closes, 14)).toBe(50);
  });

  it("throws when there isn't enough data", () => {
    expect(() => rsi([100, 101], 14)).toThrow(RangeError);
  });
});

describe("momentum", () => {
  it("is positive when price rose over the period", () => {
    expect(momentum([100, 110], 1)).toBeCloseTo(10);
  });

  it("is negative when price fell over the period", () => {
    expect(momentum([100, 90], 1)).toBeCloseTo(-10);
  });

  it("is zero when the price is unchanged", () => {
    expect(momentum([100, 100], 1)).toBe(0);
  });

  it("throws on a zero base price rather than dividing by zero", () => {
    expect(() => momentum([0, 100], 1)).toThrow(RangeError);
  });
});

describe("computeSignal", () => {
  it("throws when there aren't enough candles", () => {
    const candles = Array.from({ length: MIN_CANDLES_FOR_SIGNAL - 1 }, (_, i) => candleAt(100, i));
    expect(() => computeSignal(candles)).toThrow(RangeError);
  });

  it("is bullish (buy) on a steady uptrend", () => {
    const candles = Array.from({ length: MIN_CANDLES_FOR_SIGNAL + 10 }, (_, i) => candleAt(100 + i, i));
    const result = computeSignal(candles);
    expect(result.bias).toBe("buy");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.components.shortMovingAverage).toBeGreaterThan(result.components.longMovingAverage);
  });

  it("is bearish (sell) on a steady downtrend", () => {
    const candles = Array.from({ length: MIN_CANDLES_FOR_SIGNAL + 10 }, (_, i) => candleAt(200 - i, i));
    const result = computeSignal(candles);
    expect(result.bias).toBe("sell");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.components.shortMovingAverage).toBeLessThan(result.components.longMovingAverage);
  });

  it("is neutral (hold), zero confidence, on a completely flat price", () => {
    const candles = Array.from({ length: MIN_CANDLES_FOR_SIGNAL + 10 }, (_, i) => candleAt(100, i));
    const result = computeSignal(candles);
    expect(result.bias).toBe("hold");
    expect(result.confidence).toBe(0);
  });

  it("confidence is the fraction of the three votes that agree, never negative or above 1", () => {
    const uptrend = computeSignal(Array.from({ length: MIN_CANDLES_FOR_SIGNAL + 10 }, (_, i) => candleAt(100 + i, i)));
    expect(uptrend.confidence).toBeGreaterThanOrEqual(0);
    expect(uptrend.confidence).toBeLessThanOrEqual(1);
  });
});
