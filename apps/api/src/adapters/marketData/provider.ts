import { getEnv } from "../../config/env";
import type { MarketDataAdapter } from "./MarketDataAdapter";
import { SimulatorMarketDataAdapter } from "./SimulatorMarketDataAdapter";
import { TwelveDataMarketDataAdapter } from "./TwelveDataMarketDataAdapter";
import { CachedMarketDataAdapter } from "./CachedMarketDataAdapter";

let cached: MarketDataAdapter | undefined;

export function getMarketDataAdapter(): MarketDataAdapter {
  if (!cached) {
    const env = getEnv();
    // The cache sits in front of Twelve Data only: it absorbs the free
    // tier's ~8 credits/min quota (5-min TTL per symbol, in-flight dedupe,
    // stale-serve on 429) so the dashboard degrades to "delayed" data
    // instead of 500ing. The simulator is already free/instant — caching it
    // would only serve stale demo candles for no benefit.
    cached =
      env.MARKET_DATA_PROVIDER === "twelvedata"
        ? new CachedMarketDataAdapter(new TwelveDataMarketDataAdapter(env.TWELVE_DATA_API_KEY!))
        : new SimulatorMarketDataAdapter();
  }
  return cached;
}

/** The raw inner adapter, bypassing the quota cache — for tests only. */
export function getRawMarketDataAdapter(): MarketDataAdapter {
  const adapter = getMarketDataAdapter();
  return adapter instanceof CachedMarketDataAdapter ? adapter.unwrap() : adapter;
}

/** Test-only escape hatch, mirrors config/env.ts's resetEnvCache. */
export function resetMarketDataAdapterCache(): void {
  cached = undefined;
}
