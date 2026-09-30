import type { Candle } from "@nouveau/core";

/**
 * Live price data for the trader track's signal tool. Everything vendor-
 * specific goes behind this interface, same discipline as `KycAdapter` —
 * simulator and Twelve Data implementations share this contract.
 */
export interface MarketDataAdapter {
  readonly provider: string;
  /** Most recent `count` candles for `symbol`, oldest first — the shape
   *  `@nouveau/core`'s `computeSignal` expects directly. */
  getRecentCandles(symbol: string, count: number): Promise<Candle[]>;
}
