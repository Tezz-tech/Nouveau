import { getEnv } from "../../config/env";
import type { BrokerLinkAdapter } from "./BrokerLinkAdapter";
import { SimulatorBrokerLinkAdapter } from "./SimulatorBrokerLinkAdapter";

let cached: BrokerLinkAdapter | undefined;

export function getBrokerLinkAdapter(): BrokerLinkAdapter {
  if (!cached) {
    const env = getEnv();
    if (env.BROKER_LINK_PROVIDER === "metaapi") {
      throw new Error(
        "BROKER_LINK_PROVIDER=metaapi has no real adapter implementation yet — this is a Phase 2 addition once a MetaApi token is confirmed working."
      );
    }
    cached = new SimulatorBrokerLinkAdapter();
  }
  return cached;
}

export function resetBrokerLinkAdapterCache(): void {
  cached = undefined;
}
