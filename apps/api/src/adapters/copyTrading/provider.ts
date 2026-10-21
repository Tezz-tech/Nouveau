import { getEnv } from "../../config/env";
import type { CopyTradingAdapter } from "./CopyTradingAdapter";
import { MetaApiCopyTradingAdapter } from "./MetaApiCopyTradingAdapter";
import { NotConfiguredCopyTradingAdapter } from "./NotConfiguredCopyTradingAdapter";

let cached: CopyTradingAdapter | undefined;

/** Real adapter when META_API_TOKEN is set; otherwise a clear, scoped
 *  "not configured" error on first actual use — never a simulator, never
 *  something that blocks server startup (see config/env.ts's note on why
 *  that was a real incident). */
export function getCopyTradingAdapter(): CopyTradingAdapter {
  if (!cached) {
    const token = getEnv().META_API_TOKEN;
    cached = token ? new MetaApiCopyTradingAdapter(token) : new NotConfiguredCopyTradingAdapter();
  }
  return cached;
}

export function resetCopyTradingAdapterCache(): void {
  cached = undefined;
}
