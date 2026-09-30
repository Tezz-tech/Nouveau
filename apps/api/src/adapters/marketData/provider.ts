import { getEnv } from "../../config/env";
import type { MarketDataAdapter } from "./MarketDataAdapter";
import { SimulatorMarketDataAdapter } from "./SimulatorMarketDataAdapter";
import { MetaApiMarketDataAdapter } from "./MetaApiMarketDataAdapter";

let cached: MarketDataAdapter | undefined;

/**
 * env.ts already refuses to boot with `MARKET_DATA_PROVIDER=metaapi` and no
 * `META_API_TOKEN`/`META_API_ACCOUNT_ID` set, so the non-null assertions
 * below are safe by the time this ever runs.
 */
export function getMarketDataAdapter(): MarketDataAdapter {
  if (!cached) {
    const env = getEnv();
    cached =
      env.MARKET_DATA_PROVIDER === "metaapi"
        ? new MetaApiMarketDataAdapter(env.META_API_TOKEN!, env.META_API_ACCOUNT_ID!)
        : new SimulatorMarketDataAdapter();
  }
  return cached;
}

/** Test-only escape hatch, mirrors config/env.ts's resetEnvCache. */
export function resetMarketDataAdapterCache(): void {
  cached = undefined;
}
