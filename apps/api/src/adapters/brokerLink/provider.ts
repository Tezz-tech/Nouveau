import { getEnv } from "../../config/env";
import type { BrokerLinkAdapter } from "./BrokerLinkAdapter";
import { SimulatorBrokerLinkAdapter } from "./SimulatorBrokerLinkAdapter";
import { MetaApiBrokerLinkAdapter } from "./MetaApiBrokerLinkAdapter";

let cached: BrokerLinkAdapter | undefined;

/**
 * env.ts already refuses to boot with `BROKER_LINK_PROVIDER=metaapi` and no
 * `META_API_TOKEN` set, so the non-null assertion below is safe by the time
 * this ever runs.
 */
export function getBrokerLinkAdapter(): BrokerLinkAdapter {
  if (!cached) {
    const env = getEnv();
    cached =
      env.BROKER_LINK_PROVIDER === "metaapi"
        ? new MetaApiBrokerLinkAdapter(env.META_API_TOKEN!)
        : new SimulatorBrokerLinkAdapter();
  }
  return cached;
}

export function resetBrokerLinkAdapterCache(): void {
  cached = undefined;
}
