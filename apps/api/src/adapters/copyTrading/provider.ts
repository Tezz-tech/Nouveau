import { getEnv } from "../../config/env";
import type { CopyTradingAdapter } from "./CopyTradingAdapter";
import { MetaApiCopyTradingAdapter } from "./MetaApiCopyTradingAdapter";

let cached: CopyTradingAdapter | undefined;

/** env.ts already refuses to boot without META_API_TOKEN, so this is
 *  always the real adapter — no provider toggle, no simulator. */
export function getCopyTradingAdapter(): CopyTradingAdapter {
  if (!cached) {
    cached = new MetaApiCopyTradingAdapter(getEnv().META_API_TOKEN);
  }
  return cached;
}

export function resetCopyTradingAdapterCache(): void {
  cached = undefined;
}
