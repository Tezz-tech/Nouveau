import type { CopySubscriptionConfig, MasterTradeSignal } from "@nouveau/core";

export interface BrokerAccountRef {
  login: string;
  /** MetaApi account id once provisioned; simulator uses the login itself */
  metaapiAccountId: string | null;
}

export interface PlacedCopyOrder {
  providerReference: string;
  symbol: string;
  side: "buy" | "sell";
  volume: number;
}

export interface CopyBrokerAdapter {
  readonly provider: string;
  /** Create (or fetch) the CopyFactory strategy for the master account. Returns the strategyId followers subscribe to. */
  ensureMasterStrategy(master: BrokerAccountRef, strategyName: string): Promise<{ strategyId: string }>;
  /** Link one follower account to the master strategy. Returns the subscriber/subscription id. */
  subscribeFollower(follower: BrokerAccountRef, strategyId: string, config: CopySubscriptionConfig): Promise<{ subscriberId: string }>;
  /** Stop copying for one follower. */
  unsubscribeFollower(subscriberId: string): Promise<void>;
  /** Place one sized copy order on a follower account. */
  placeCopyOrder(follower: BrokerAccountRef, trade: { symbol: string; side: "buy" | "sell"; volume: number }): Promise<PlacedCopyOrder>;
  /** Master trades since `since` — used by the engine poll loop. */
  listMasterSignals(master: BrokerAccountRef, since: Date): Promise<MasterTradeSignal[]>;
}
