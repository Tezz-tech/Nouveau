import { getEnv } from "../../config/env";
import type { MarketDataAdapter } from "./MarketDataAdapter";
import { SimulatorMarketDataAdapter } from "./SimulatorMarketDataAdapter";

let cached: MarketDataAdapter | undefined;

/**
 * `MARKET_DATA_PROVIDER=metaapi` is the intended real path (see the note in
 * config/env.ts) but has no implementation yet — only the simulator exists
 * until a real MetaApi token is configured. env.ts already refuses to boot
 * with `MARKET_DATA_PROVIDER=metaapi` and no `META_API_TOKEN` set, so this
 * function only ever needs to handle the simulator case today.
 */
export function getMarketDataAdapter(): MarketDataAdapter {
  if (!cached) {
    const env = getEnv();
    if (env.MARKET_DATA_PROVIDER === "metaapi") {
      throw new Error(
        "MARKET_DATA_PROVIDER=metaapi has no real adapter implementation yet — this is a Phase 2 addition once a MetaApi token is confirmed working."
      );
    }
    cached = new SimulatorMarketDataAdapter();
  }
  return cached;
}

/** Test-only escape hatch, mirrors config/env.ts's resetEnvCache. */
export function resetMarketDataAdapterCache(): void {
  cached = undefined;
}
