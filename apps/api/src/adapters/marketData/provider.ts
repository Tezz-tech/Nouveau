import { getEnv } from "../../config/env";
import type { MarketDataAdapter } from "./MarketDataAdapter";
import { SimulatorMarketDataAdapter } from "./SimulatorMarketDataAdapter";
import { TwelveDataMarketDataAdapter } from "./TwelveDataMarketDataAdapter";

let cached: MarketDataAdapter | undefined;

export function getMarketDataAdapter(): MarketDataAdapter {
  if (!cached) {
    const env = getEnv();
    cached =
      env.MARKET_DATA_PROVIDER === "twelvedata"
        ? new TwelveDataMarketDataAdapter(env.TWELVE_DATA_API_KEY!)
        : new SimulatorMarketDataAdapter();
  }
  return cached;
}

/** Test-only escape hatch, mirrors config/env.ts's resetEnvCache. */
export function resetMarketDataAdapterCache(): void {
  cached = undefined;
}
