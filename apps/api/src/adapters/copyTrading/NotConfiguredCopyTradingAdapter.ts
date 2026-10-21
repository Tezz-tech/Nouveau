import { HttpError } from "../../middleware/errorHandler";
import type {
  CopyTradingAdapter,
  LinkSubscriberAccountInput,
  LinkSubscriberAccountResult,
  ConnectionStatusResult,
  EnsureProviderStrategyInput,
  EnsureProviderStrategyResult,
} from "./CopyTradingAdapter";

const MESSAGE = "MetaApi isn't configured yet — set META_API_TOKEN in apps/api/.env to enable bot linking.";

/**
 * Returned by `provider.ts` when `META_API_TOKEN` is absent, instead of
 * either crashing the whole server at boot (the previous behavior — a
 * missing token took down every unrelated route, including auth) or
 * silently faking success (which this build deliberately never does). Only
 * a request that actually needs a real MetaApi call fails, with a clear
 * 503, scoped to exactly that request.
 */
export class NotConfiguredCopyTradingAdapter implements CopyTradingAdapter {
  readonly provider = "not-configured";

  async linkSubscriberAccount(_input: LinkSubscriberAccountInput): Promise<LinkSubscriberAccountResult> {
    throw new HttpError(503, MESSAGE);
  }

  async pollConnectionStatus(_metaApiAccountId: string): Promise<ConnectionStatusResult> {
    throw new HttpError(503, MESSAGE);
  }

  async subscribeToStrategy(_metaApiAccountId: string, _copyFactoryStrategyId: string, _multiplier: number): Promise<void> {
    throw new HttpError(503, MESSAGE);
  }

  async ensureProviderStrategy(_input: EnsureProviderStrategyInput): Promise<EnsureProviderStrategyResult> {
    throw new HttpError(503, MESSAGE);
  }
}
