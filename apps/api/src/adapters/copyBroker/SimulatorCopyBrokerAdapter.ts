import { randomUUID } from "node:crypto";
import type { CopySubscriptionConfig, MasterTradeSignal } from "@nouveau/core";
import type { BrokerAccountRef, CopyBrokerAdapter, PlacedCopyOrder } from "./CopyBrokerAdapter";

/**
 * In-memory stand-in for MetaApi + CopyFactory. Behaves like the real
 * wiring from the engine's point of view (strategy ids, subscriber ids,
 * order references, master signal feed) with zero vendor credentials.
 * The AI demo endpoint writes into this feed; the engine poll reads it back.
 */
interface StoredSignal extends MasterTradeSignal {
  at: number;
}

const strategies = new Map<string, { name: string; masterLogin: string }>();
const subscribers = new Map<string, { strategyId: string; login: string; config: CopySubscriptionConfig }>();
const masterSignals = new Map<string, StoredSignal[]>();

export function __resetSimulatorCopyBroker(): void {
  strategies.clear();
  subscribers.clear();
  masterSignals.clear();
}

/** Demo/test hook: the "master terminal" publishes a trade here. */
export function publishSimulatorMasterTrade(masterLogin: string, signal: MasterTradeSignal): void {
  const list = masterSignals.get(masterLogin) ?? [];
  list.push({ ...signal, at: Date.now() });
  masterSignals.set(masterLogin, list);
}

export class SimulatorCopyBrokerAdapter implements CopyBrokerAdapter {
  readonly provider = "simulator";

  async ensureMasterStrategy(master: BrokerAccountRef, strategyName: string): Promise<{ strategyId: string }> {
    for (const [id, s] of strategies) {
      if (s.masterLogin === master.login) return { strategyId: id };
    }
    const strategyId = `sim-strat-${randomUUID().slice(0, 8)}`;
    strategies.set(strategyId, { name: strategyName, masterLogin: master.login });
    return { strategyId };
  }

  async subscribeFollower(
    follower: BrokerAccountRef,
    strategyId: string,
    config: CopySubscriptionConfig
  ): Promise<{ subscriberId: string }> {
    if (!strategies.has(strategyId)) throw new Error(`Unknown strategy ${strategyId}`);
    const subscriberId = `sim-sub-${randomUUID().slice(0, 8)}`;
    subscribers.set(subscriberId, { strategyId, login: follower.login, config });
    return { subscriberId };
  }

  async unsubscribeFollower(subscriberId: string): Promise<void> {
    subscribers.delete(subscriberId);
  }

  async placeCopyOrder(
    follower: BrokerAccountRef,
    trade: { symbol: string; side: "buy" | "sell"; volume: number }
  ): Promise<PlacedCopyOrder> {
    if (trade.volume <= 0) throw new Error("Volume must be positive.");
    return {
      providerReference: `sim-order-${randomUUID().slice(0, 8)}`,
      symbol: trade.symbol,
      side: trade.side,
      volume: trade.volume,
    };
  }

  async listMasterSignals(master: BrokerAccountRef, since: Date): Promise<MasterTradeSignal[]> {
    const list = masterSignals.get(master.login) ?? [];
    return list.filter((s) => s.at > since.getTime());
  }
}
