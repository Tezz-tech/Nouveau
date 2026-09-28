import { SignalLog, type UserDocument } from "@nouveau/db";
import { computeSignal, MIN_CANDLES_FOR_SIGNAL, type SignalResult } from "@nouveau/core";
import { HttpError } from "../middleware/errorHandler";
import type { MarketDataAdapter } from "../adapters/marketData/MarketDataAdapter";
import type { NarrationAdapter } from "../adapters/narration/NarrationAdapter";
import { SIGNAL_DISCLAIMER_VERSION, SIGNAL_DISCLAIMER_TEXT } from "./signalDisclaimer";

const CANDLES_REQUESTED = MIN_CANDLES_FOR_SIGNAL + 10;

export interface SignalResponse {
  symbol: string;
  bias: SignalResult["bias"];
  confidence: number;
  narration: string;
  disclaimer: string;
  /** The same candles the signal above was computed from, reshaped for the
   *  dashboard's price chart (`day` is just the candle's index, not a
   *  calendar day) — so the chart a trader sees and the signal they read
   *  are guaranteed to agree, instead of two separate fetches that could
   *  drift apart. */
  priceSeries: { day: number; price: number }[];
  /** The market-data adapter's own `provider` name ("simulator" until a
   *  real vendor is wired) — lets the frontend show an accurate "this is
   *  simulated data" banner without hardcoding that assumption on its own
   *  side, so the banner disappears automatically once Phase 2 flips this
   *  to a real provider. */
  dataSource: string;
}

/**
 * Market data adapter -> @nouveau/core's deterministic computeSignal ->
 * narration adapter -> audit log. The bias/confidence never come from
 * anywhere but `computeSignal`'s arithmetic — the narration adapter only
 * ever describes that already-decided value, it cannot override it.
 */
export async function getSignal(
  user: UserDocument,
  symbol: string,
  marketDataAdapter: MarketDataAdapter,
  narrationAdapter: NarrationAdapter
): Promise<SignalResponse> {
  const candles = await marketDataAdapter.getRecentCandles(symbol, CANDLES_REQUESTED);
  if (candles.length < MIN_CANDLES_FOR_SIGNAL) {
    throw new HttpError(503, `Not enough market data for ${symbol} yet — try again shortly.`);
  }

  const signal = computeSignal(candles);
  const narration = await narrationAdapter.narrate(signal, symbol);

  await SignalLog.create({
    userId: user._id,
    symbol,
    bias: signal.bias,
    confidence: signal.confidence,
    narration,
    disclaimerVersion: SIGNAL_DISCLAIMER_VERSION,
  });

  return {
    symbol,
    bias: signal.bias,
    confidence: signal.confidence,
    narration,
    disclaimer: SIGNAL_DISCLAIMER_TEXT,
    priceSeries: candles.map((c, day) => ({ day, price: c.close })),
    dataSource: marketDataAdapter.provider,
  };
}
