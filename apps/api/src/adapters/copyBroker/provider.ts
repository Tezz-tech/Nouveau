import { getEnv } from "../../config/env";
import type { CopyBrokerAdapter } from "./CopyBrokerAdapter";
import { SimulatorCopyBrokerAdapter } from "./SimulatorCopyBrokerAdapter";
import { MetaApiCopyBrokerAdapter } from "./MetaApiCopyBrokerAdapter";

let cached: CopyBrokerAdapter | undefined;

export function getCopyBrokerAdapter(): CopyBrokerAdapter {
  if (!cached) {
    const env = getEnv();
    cached =
      env.COPY_BROKER_PROVIDER === "metaapi"
        ? new MetaApiCopyBrokerAdapter({
            apiToken: env.METAAPI_API_TOKEN!,
            copyFactoryUrl: env.COPY_BROKER_BASE_URL ?? "https://copyfactory-api-v1.new-york.agiliumtrade.ai",
            region: env.METAAPI_REGION,
          })
        : new SimulatorCopyBrokerAdapter();
  }
  return cached;
}

export function resetCopyBrokerAdapterCache(): void {
  cached = undefined;
}
