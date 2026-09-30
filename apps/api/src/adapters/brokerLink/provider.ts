import { getEnv } from "../../config/env";
import type { BrokerLinkAdapter } from "./BrokerLinkAdapter";
import { SimulatorBrokerLinkAdapter } from "./SimulatorBrokerLinkAdapter";

let cached: BrokerLinkAdapter | undefined;

export function getBrokerLinkAdapter(): BrokerLinkAdapter {
  if (!cached) {
    getEnv(); // Validate environment configuration before constructing adapters.
    cached = new SimulatorBrokerLinkAdapter();
  }
  return cached;
}

export function resetBrokerLinkAdapterCache(): void {
  cached = undefined;
}
