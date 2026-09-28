import { movingAverage, rsi, momentum } from "./indicators";
import type { Candle, SignalResult, SignalBias } from "./types";

const SHORT_MA_PERIOD = 10;
const LONG_MA_PERIOD = 30;
const RSI_PERIOD = 14;
const MOMENTUM_PERIOD = 10;
const RSI_OVERBOUGHT = 70;
const RSI_OVERSOLD = 30;

export const MIN_CANDLES_FOR_SIGNAL = LONG_MA_PERIOD + 1;

/**
 * Combines three independent, deterministic votes — trend (short vs. long
 * moving average), RSI overbought/oversold, and momentum direction — into a
 * single bias and a confidence score. Each vote is -1 (bearish) / 0
 * (neutral) / +1 (bullish); confidence is just how many of the three agree.
 * No machine learning, no LLM — this is intentionally simple, auditable
 * arithmetic, so "why did it say buy" always has an exact answer, and so an
 * LLM narrating the result (see apps/api's NarrationAdapter) has nothing to
 * do but explain a number that was already decided here.
 */
export function computeSignal(candles: readonly Candle[]): SignalResult {
  if (candles.length < MIN_CANDLES_FOR_SIGNAL) {
    throw new RangeError(`computeSignal needs at least ${MIN_CANDLES_FOR_SIGNAL} candles, got ${candles.length}`);
  }

  const closes = candles.map((c) => c.close);
  const shortMovingAverage = movingAverage(closes, SHORT_MA_PERIOD);
  const longMovingAverage = movingAverage(closes, LONG_MA_PERIOD);
  const rsiValue = rsi(closes, RSI_PERIOD);
  const momentumValue = momentum(closes, MOMENTUM_PERIOD);

  const trendVote = Math.sign(shortMovingAverage - longMovingAverage);
  const rsiVote = rsiValue >= RSI_OVERBOUGHT ? -1 : rsiValue <= RSI_OVERSOLD ? 1 : 0;
  const momentumVote = Math.sign(momentumValue);

  const score = trendVote + rsiVote + momentumVote; // -3..3
  const bias: SignalBias = score > 0 ? "buy" : score < 0 ? "sell" : "hold";
  const confidence = Math.abs(score) / 3;

  return {
    bias,
    confidence,
    components: { shortMovingAverage, longMovingAverage, rsi: rsiValue, momentum: momentumValue },
  };
}
