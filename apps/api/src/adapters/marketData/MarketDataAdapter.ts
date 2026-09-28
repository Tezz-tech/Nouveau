import type { Candle } from "@nouveau/core";

/**
 * Live price data for the trader track's signal tool. Everything vendor-
 * specific goes behind this interface, same discipline as `KycAdapter` —
 * only `SimulatorMarketDataAdapter` exists so far, since no real market-data
 * vendor credentials are configured yet. `MtAccount.metaApiId` already
 * hints MetaApi (metaapi.cloud) as the intended real provider.
 */
export interface MarketDataAdapter {
  readonly provider: string;
  /** Most recent `count` candles for `symbol`, oldest first — the shape
   *  `@nouveau/core`'s `computeSignal` expects directly. */
  getRecentCandles(symbol: string, count: number): Promise<Candle[]>;
}
