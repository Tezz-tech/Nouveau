import type { CopySubscriptionConfig, MasterTradeSignal } from "@nouveau/core";
import type { BrokerAccountRef, CopyBrokerAdapter, PlacedCopyOrder } from "./CopyBrokerAdapter";

/**
 * Real MetaApi + CopyFactory wiring over plain REST (no SDK dependency —
 * keeps the serverless bundle small and avoids a new vendor lock-in at the
 * import level). Standard flow, per CopyFactory docs:
 *
 *   master MetaApi account  ->  POST /strategies            -> strategyId
 *   follower MetaApi account ->  POST /subscribers           -> subscriberId
 *   master trade             ->  CopyFactory copies to every subscriber
 *                                (multiplier / symbol mapping / risk limits
 *                                all live server-side, not in our code)
 *
 * Copies here are placed via the MetaApi trade REST endpoint on each
 * follower account (our engine sizes them with @nouveau/core first), while
 * the CopyFactory strategy/subscriber records remain the source of truth
 * for "who follows whom" in the MetaApi dashboard.
 *
 * Required env: METAAPI_API_TOKEN, METAAPI_MASTER_ACCOUNT_ID.
 * Docs: https://metaapi.cloud/docs/copyfactory/
 */
export interface MetaApiAdapterOptions {
  apiToken: string;
  copyFactoryUrl: string;
  region: string;
}

function copyRatioFor(config: CopySubscriptionConfig): number {
  if (config.mode === "fixed_lot") return config.fixedLot ?? 0.01;
  return config.multiplier;
}

export class MetaApiCopyBrokerAdapter implements CopyBrokerAdapter {
  readonly provider = "metaapi";

  constructor(private readonly opts: MetaApiAdapterOptions) {}

  private headers(): Record<string, string> {
    return { "auth-token": this.opts.apiToken, "Content-Type": "application/json" };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.opts.copyFactoryUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body == null ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`CopyFactory ${method} ${path} failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  async ensureMasterStrategy(master: BrokerAccountRef, strategyName: string): Promise<{ strategyId: string }> {
    const existing = await this.request<Array<{ _id: string; accountId: string }>>("GET", "/strategies");
    const found = existing.find((s) => s.accountId === master.metaapiAccountId);
    if (found) return { strategyId: found._id };
    const created = await this.request<{ id: string }>("POST", "/strategies", {
      name: strategyName,
      accountId: master.metaapiAccountId ?? master.login,
      // Risk envelope lives server-side in CopyFactory too — our engine's
      // AI gate is the first check, this is the second.
      maxStopLoss: { value: 100, units: "PIPS" },
      tradeSizeScaling: { mode: "MULTIPLIER", multiplier: 1 },
    });
    return { strategyId: created.id };
  }

  async subscribeFollower(
    follower: BrokerAccountRef,
    strategyId: string,
    config: CopySubscriptionConfig
  ): Promise<{ subscriberId: string }> {
    const created = await this.request<{ id: string }>("POST", "/subscribers", {
      name: `follower-${follower.login}`,
      accountId: follower.metaapiAccountId ?? follower.login,
      subscriptions: [
        {
          strategyId,
          multiplier: copyRatioFor(config),
          symbolMapping: (config.allowedSymbols ?? []).map((s) => ({ from: s, to: s })),
          reverse: config.reverse === true,
          maxTradeRisk: config.maxTradeLot,
          skipPendingOrders: false,
        },
      ],
    });
    return { subscriberId: created.id };
  }

  async unsubscribeFollower(subscriberId: string): Promise<void> {
    await this.request("DELETE", `/subscribers/${encodeURIComponent(subscriberId)}`);
  }

  async placeCopyOrder(
    follower: BrokerAccountRef,
    trade: { symbol: string; side: "buy" | "sell"; volume: number }
  ): Promise<PlacedCopyOrder> {
    const accountId = follower.metaapiAccountId ?? follower.login;
    // MetaApi trade REST: POST /users/current/accounts/:accountId/trade
    const res = await fetch(
      `https://mt-client-api-v1.${this.opts.region}.agiliumtrade.ai/users/current/accounts/${encodeURIComponent(accountId)}/trade`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          actionType: trade.side === "buy" ? "POSITION_TYPE_BUY" : "POSITION_TYPE_SELL",
          symbol: trade.symbol,
          volume: trade.volume,
        }),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`MetaApi trade failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as { orderId?: string };
    return {
      providerReference: String(data.orderId ?? `${Date.now()}`),
      symbol: trade.symbol,
      side: trade.side,
      volume: trade.volume,
    };
  }

  async listMasterSignals(_master: BrokerAccountRef, _since: Date): Promise<MasterTradeSignal[]> {
    // With real CopyFactory, copying happens server-side inside MetaApi —
    // our engine doesn't poll master trades (there's nothing to poll into).
    // Return empty so the local fan-out loop is a no-op in metaapi mode;
    // history stays visible in the MetaApi dashboard + our CopyTrade rows
    // written at subscribe/place time.
    return [];
  }
}
