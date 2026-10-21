import type {
  CopyTradingAdapter,
  LinkSubscriberAccountInput,
  LinkSubscriberAccountResult,
  ConnectionStatusResult,
  EnsureProviderStrategyInput,
  EnsureProviderStrategyResult,
} from "../../adapters/copyTrading/CopyTradingAdapter";

/** Deterministic in-memory double for automated tests — not a selectable
 *  production mode. See config/env.ts's note on why this build has no
 *  simulator for the real thing; this lives under test/fakes specifically
 *  so there's no path by which it could ever be wired into a running
 *  server. */
export class FakeCopyTradingAdapter implements CopyTradingAdapter {
  readonly provider = "fake";
  private counter = 0;
  public subscribeCalls: { metaApiAccountId: string; copyFactoryStrategyId: string; multiplier: number }[] = [];
  /** Defaults every account to "connected" immediately — most tests don't
   *  care about the deploying/connecting window. Set per-account to
   *  exercise the polling/failure paths explicitly. */
  public connectionStageOverride: Record<string, ConnectionStatusResult["stage"]> = {};

  async linkSubscriberAccount(_input: LinkSubscriberAccountInput): Promise<LinkSubscriberAccountResult> {
    this.counter += 1;
    return { metaApiAccountId: `fake-meta-account-${this.counter}` };
  }

  async pollConnectionStatus(metaApiAccountId: string): Promise<ConnectionStatusResult> {
    const stage = this.connectionStageOverride[metaApiAccountId] ?? "connected";
    return { stage, errorMessage: stage === "failed" ? "fake connection failure" : undefined };
  }

  async subscribeToStrategy(metaApiAccountId: string, copyFactoryStrategyId: string, multiplier: number): Promise<void> {
    this.subscribeCalls.push({ metaApiAccountId, copyFactoryStrategyId, multiplier });
  }

  async ensureProviderStrategy(input: EnsureProviderStrategyInput): Promise<EnsureProviderStrategyResult> {
    this.counter += 1;
    return {
      metaApiAccountId: input.existingMetaApiAccountId ?? `fake-master-account-${this.counter}`,
      copyFactoryStrategyId: `fake-strategy-${this.counter}`,
      appliedConfig: { name: input.name },
    };
  }
}
