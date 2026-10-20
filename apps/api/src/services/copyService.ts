import { MasterStrategy, CopySubscription, CopyDecision, CopyTrade, MtAccount } from "@nouveau/db";
import {
  sizeCopyTrade,
  runAIGate,
  AI_GATE_VERSION,
  validateSubscriptionConfig,
  DEFAULT_SUBSCRIPTION,
  MIN_CANDLES_FOR_SIGNAL,
  type CopySubscriptionConfig,
  type AITradeProposal,
  type MasterTradeSignal,
} from "@nouveau/core";
import { HttpError } from "../middleware/errorHandler";
import type { CopyBrokerAdapter } from "../adapters/copyBroker/CopyBrokerAdapter";
import type { MarketDataAdapter } from "../adapters/marketData/MarketDataAdapter";

export const MASTER_LOGIN = "nouveau-master";

export async function getOrCreateMaster(): Promise<{ login: string; strategyId: string | null }> {
  let master = await MasterStrategy.findOne({ status: "active" }).sort({ createdAt: 1 });
  if (!master) {
    master = await MasterStrategy.create({ name: "Nouveau Master", status: "active" });
  }
  return { login: MASTER_LOGIN, strategyId: master.strategyId ?? null };
}

export async function subscribeToMaster(
  userId: string,
  copyBroker: CopyBrokerAdapter,
  input: Partial<CopySubscriptionConfig>
): Promise<{ subscriptionId: string; subscriberId: string; strategyId: string }> {
  const account = await MtAccount.findOne({ userId }).sort({ createdAt: -1 });
  if (!account) throw new HttpError(409, "Complete the broker account step first.");
  const config: CopySubscriptionConfig = {
    mode: input.mode ?? DEFAULT_SUBSCRIPTION.mode,
    multiplier: input.multiplier ?? DEFAULT_SUBSCRIPTION.multiplier,
    fixedLot: input.fixedLot ?? undefined,
    maxTradeLot: input.maxTradeLot ?? DEFAULT_SUBSCRIPTION.maxTradeLot,
    minTradeLot: input.minTradeLot ?? DEFAULT_SUBSCRIPTION.minTradeLot,
    reverse: input.reverse ?? false,
    allowedSymbols: input.allowedSymbols ?? [],
  };
  const configError = validateSubscriptionConfig(config);
  if (configError) throw new HttpError(400, configError);
  const existing = await CopySubscription.findOne({ userId, status: "active" });
  if (existing) throw new HttpError(409, "This account is already copy-trading the master.");
  const { strategyId } = await copyBroker.ensureMasterStrategy(
    { login: MASTER_LOGIN, metaapiAccountId: null },
    "Nouveau Master"
  );
  await MasterStrategy.updateOne({ status: "active" }, { $set: { strategyId } });
  const { subscriberId } = await copyBroker.subscribeFollower(
    { login: account.login, metaapiAccountId: null },
    strategyId,
    config
  );
  const sub = await CopySubscription.create({
    userId,
    mtAccountId: account._id,
    strategyId,
    subscriberId,
    status: "active",
    mode: config.mode,
    multiplier: config.multiplier,
    fixedLot: config.fixedLot ?? null,
    maxTradeLot: config.maxTradeLot,
    minTradeLot: config.minTradeLot,
    reverse: config.reverse,
    allowedSymbols: config.allowedSymbols,
  });
  return { subscriptionId: String(sub._id), subscriberId, strategyId };
}

export async function unsubscribeFromMaster(userId: string, copyBroker: CopyBrokerAdapter): Promise<void> {
  const sub = await CopySubscription.findOne({ userId, status: "active" });
  if (!sub) throw new HttpError(404, "No active copy subscription.");
  if (sub.subscriberId) {
    await copyBroker.unsubscribeFollower(sub.subscriberId).catch(() => undefined);
  }
  sub.status = "unsubscribed";
  await sub.save();
}

/**
 * AI proposes -> deterministic gate decides -> approved master trade fans
 * out to every active follower via @nouveau/core sizing. Invariant #8 holds:
 * the AI output is a proposal object, never a placed order.
 */
export async function proposeMasterTrade(
  proposal: AITradeProposal,
  marketData: MarketDataAdapter,
  copyBroker: CopyBrokerAdapter,
  riskState: { openPositions: number } = { openPositions: 0 }
): Promise<{ verdict: string; copies: number; skipped: number; logReason: string }> {
  const master = await getOrCreateMaster();
  const symbol = proposal.symbol.replace("/", "");
  const candles = await marketData.getRecentCandles(symbol, MIN_CANDLES_FOR_SIGNAL + 10);
  const gate = runAIGate({
    proposal,
    candles,
    openPositions: riskState.openPositions,
    maxOpenPositions: 5,
    dailyLossPct: 0,
    maxDailyLossPct: 5,
  });
  await CopyDecision.create({
    strategyId: master.strategyId,
    gateVersion: AI_GATE_VERSION,
    symbol: proposal.symbol,
    bias: proposal.bias,
    aiConfidence: proposal.confidence,
    aiReason: proposal.reason,
    verdict: gate.verdict,
    approvedLot: gate.approvedLot,
    logReason: gate.logReason,
    masterTicket: gate.approvedLot != null ? `master-${Date.now()}` : null,
  });
  if (gate.verdict === "block" || gate.approvedLot == null || proposal.bias === "hold") {
    return { verdict: gate.verdict, copies: 0, skipped: 0, logReason: gate.logReason };
  }
  const signal: MasterTradeSignal = {
    ticket: `master-${Date.now()}`,
    symbol: proposal.symbol,
    side: proposal.bias,
    masterLot: gate.approvedLot,
    entryPrice: candles[candles.length - 1]!.close,
    stopLoss: null,
    takeProfit: null,
    openedAt: new Date().toISOString(),
    strategyId: master.strategyId ?? "sim",
    reason: gate.logReason,
    aiConfidence: proposal.confidence,
  };
  const result = await fanOutMasterTrade(signal, copyBroker);
  return { verdict: gate.verdict, ...result, logReason: gate.logReason };
}

/** Copy one master trade to every active follower. Shared by demo + poll loop. */
export async function fanOutMasterTrade(
  signal: MasterTradeSignal,
  copyBroker: CopyBrokerAdapter
): Promise<{ copies: number; skipped: number }> {
  const subs = await CopySubscription.find({ status: "active" });
  let copies = 0;
  let skipped = 0;
  for (const sub of subs) {
    const account = await MtAccount.findById(sub.mtAccountId);
    const sized = sizeCopyTrade(
      signal,
      {
        userId: String(sub.userId),
        login: account?.login ?? "unknown",
        equity: 1000,
        masterEquity: 10000,
        subscription: {
          mode: sub.mode as CopySubscriptionConfig["mode"],
          multiplier: sub.multiplier,
          fixedLot: sub.fixedLot ?? undefined,
          maxTradeLot: sub.maxTradeLot,
          minTradeLot: sub.minTradeLot,
          reverse: sub.reverse,
          allowedSymbols: sub.allowedSymbols ?? [],
        },
      }
    );
    if ("skipped" in sized) {
      skipped++;
      await CopyTrade.create({
        userId: sub.userId,
        subscriptionId: sub._id,
        masterTicket: signal.ticket,
        symbol: signal.symbol,
        side: signal.side,
        masterLot: signal.masterLot,
        followerLot: 0,
        status: "skipped",
        reason: sized.skipped,
      });
      continue;
    }
    try {
      const placed = await copyBroker.placeCopyOrder(
        { login: account?.login ?? "unknown", metaapiAccountId: null },
        sized
      );
      copies++;
      await CopyTrade.create({
        userId: sub.userId,
        subscriptionId: sub._id,
        masterTicket: signal.ticket,
        symbol: signal.symbol,
        side: sized.side,
        masterLot: signal.masterLot,
        followerLot: sized.volume,
        status: "copied",
        reason: sized.reason,
        providerReference: placed.providerReference,
      });
    } catch (err) {
      skipped++;
      await CopyTrade.create({
        userId: sub.userId,
        subscriptionId: sub._id,
        masterTicket: signal.ticket,
        symbol: signal.symbol,
        side: signal.side,
        masterLot: signal.masterLot,
        followerLot: sized.volume,
        status: "failed",
        reason: err instanceof Error ? err.message : "Order failed.",
      });
    }
  }
  return { copies, skipped };
}

export async function listMyCopies(userId: string, limit = 50) {
  const rows = await CopyTrade.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  return rows.map((r) => ({
    masterTicket: r.masterTicket,
    symbol: r.symbol,
    side: r.side,
    masterLot: r.masterLot,
    followerLot: r.followerLot,
    status: r.status,
    reason: r.reason,
    createdAt: r.get("createdAt"),
  }));
}

export async function listDecisions(limit = 50) {
  const rows = await CopyDecision.find({}).sort({ createdAt: -1 }).limit(limit);
  return rows.map((r) => ({
    symbol: r.symbol,
    bias: r.bias,
    verdict: r.verdict,
    approvedLot: r.approvedLot,
    logReason: r.logReason,
    createdAt: r.get("createdAt"),
  }));
}
