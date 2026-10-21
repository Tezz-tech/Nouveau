export interface LinkSubscriberAccountInput {
  broker: string;
  login: string;
  serverName: string;
  /** Real, trading-capable MT5 password — CopyFactory places real orders
   *  on this account, so a read-only investor password would not work
   *  here even if offered. */
  tradingPassword: string;
}

export interface LinkSubscriberAccountResult {
  metaApiAccountId: string;
}

export type ConnectionStage = "deploying" | "connecting" | "connected" | "failed";

export interface ConnectionStatusResult {
  stage: ConnectionStage;
  errorMessage?: string;
}

export interface EnsureProviderStrategyInput {
  name: string;
  description: string;
  maxTradeRiskPct?: number;
  /** Either an already-provisioned MetaApi account id (the master account
   *  was set up directly in the MetaApi dashboard), or full credentials to
   *  provision one fresh — exactly one of the two should be given. Either
   *  way, a plaintext master-account password passed here is used only for
   *  the one provisioning call and is never persisted anywhere. */
  existingMetaApiAccountId?: string;
  broker?: string;
  login?: string;
  serverName?: string;
  tradingPassword?: string;
}

export interface EnsureProviderStrategyResult {
  metaApiAccountId: string;
  copyFactoryStrategyId: string;
  appliedConfig: unknown;
}

/**
 * Wraps both MetaApi account provisioning (the official `metaapi.cloud-sdk`)
 * and CopyFactory strategy/subscriber management (the official
 * `metaapi.cloud-copyfactory-sdk`) behind one interface. Real-only by
 * explicit client choice — there is no simulator for this build (see
 * config/env.ts) since there's no meaningful "fake" version of copy
 * trading. Automated tests use `test/fakes/FakeCopyTradingAdapter`
 * instead, injected via `createApp(deps)`.
 */
export interface CopyTradingAdapter {
  readonly provider: string;
  /** Creates and deploys a subscriber account, sets its CopyFactory role,
   *  and returns immediately — does NOT wait for the account to finish
   *  connecting (that can take real wall-clock time; serverless function
   *  execution limits are shorter than MetaApi's worst case). Callers poll
   *  `pollConnectionStatus` separately. */
  linkSubscriberAccount(input: LinkSubscriberAccountInput): Promise<LinkSubscriberAccountResult>;
  pollConnectionStatus(metaApiAccountId: string): Promise<ConnectionStatusResult>;
  subscribeToStrategy(metaApiAccountId: string, copyFactoryStrategyId: string, multiplier: number): Promise<void>;
  /** Idempotent-ish (diffs against the caller-supplied previous config
   *  rather than blindly re-pushing) — used only by the master-strategy
   *  seed script, not by any user-facing request path. May block on
   *  `waitConnected`, unlike `linkSubscriberAccount`, since it only ever
   *  runs offline. */
  ensureProviderStrategy(input: EnsureProviderStrategyInput): Promise<EnsureProviderStrategyResult>;
}
