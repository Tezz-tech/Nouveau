export type CopyMode = "multiplier" | "fixed_lot" | "balance_proportional";

export interface CopySubscriptionConfig {
  mode: CopyMode;
  /** multiplier mode: e.g. 1 = mirror master lots, 2 = double, 0.5 = half */
  multiplier: number;
  /** fixed_lot mode: lots per copied trade */
  fixedLot?: number;
  /** max lots per single copied trade (broker + risk cap) */
  maxTradeLot: number;
  /** min lots per single copied trade */
  minTradeLot: number;
  /** reverse direction (contrarian demo / hedge) */
  reverse: boolean;
  /** only copy these symbols; empty = all */
  allowedSymbols: string[];
  /** skip copying if master lot * multiplier would exceed this */
  maxMasterLotAllowed?: number;
}

export interface MasterTradeSignal {
  ticket: string;
  symbol: string;
  side: "buy" | "sell";
  /** master lots, e.g. 1.0 */
  masterLot: number;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: string;
  strategyId: string;
  /** AI-written reason — required by invariant #6 */
  reason: string;
  /** AI confidence 0..1 */
  aiConfidence: number;
}

export interface FollowerAccountSnapshot {
  userId: string;
  login: string;
  /** follower equity in account currency (for proportional sizing) */
  equity: number;
  masterEquity: number;
  subscription: CopySubscriptionConfig;
}

export interface SizedCopyTrade {
  symbol: string;
  side: "buy" | "sell";
  volume: number;
  reason: string;
}

export const DEFAULT_SUBSCRIPTION: CopySubscriptionConfig = {
  mode: "multiplier",
  multiplier: 1,
  maxTradeLot: 5,
  minTradeLot: 0.01,
  reverse: false,
  allowedSymbols: [],
};

export function validateSubscriptionConfig(input: CopySubscriptionConfig): string | null {
  if (!["multiplier", "fixed_lot", "balance_proportional"].includes(input.mode)) return "Unknown copy mode.";
  if (!Number.isFinite(input.multiplier) || input.multiplier <= 0 || input.multiplier > 10) {
    return "Multiplier must be > 0 and <= 10.";
  }
  if (input.mode === "fixed_lot") {
    if (input.fixedLot == null || !Number.isFinite(input.fixedLot) || input.fixedLot <= 0 || input.fixedLot > 10) {
      return "fixedLot must be a positive lot size <= 10.";
    }
  }
  if (!Number.isFinite(input.maxTradeLot) || input.maxTradeLot <= 0) return "maxTradeLot must be positive.";
  if (!Number.isFinite(input.minTradeLot) || input.minTradeLot <= 0) return "minTradeLot must be positive.";
  if (input.minTradeLot > input.maxTradeLot) return "minTradeLot cannot exceed maxTradeLot.";
  return null;
}

/** Round down to broker 0.01 step, never invent volume. */
export function roundLotToStep(lot: number, step = 0.01): number {
  return Math.floor(lot / step) * step;
}

/**
 * Pure lot sizing — the ONLY place follower volume may be computed.
 * No I/O, no prices, no floats for money (lots are broker units, not money).
 */
export function sizeCopyTrade(signal: MasterTradeSignal, follower: FollowerAccountSnapshot): SizedCopyTrade | { skipped: string } {
  const sub = follower.subscription;

  if (sub.allowedSymbols.length > 0 && !sub.allowedSymbols.includes(signal.symbol)) {
    return { skipped: `Symbol ${signal.symbol} not in allow-list.` };
  }
  if (sub.maxMasterLotAllowed != null && signal.masterLot > sub.maxMasterLotAllowed) {
    return { skipped: `Master lot ${signal.masterLot} exceeds per-trade cap.` };
  }

  let raw: number;
  if (sub.mode === "fixed_lot") {
    raw = sub.fixedLot!;
  } else if (sub.mode === "balance_proportional") {
    if (follower.masterEquity <= 0 || follower.equity <= 0) return { skipped: "Missing equity for proportional sizing." };
    raw = signal.masterLot * (follower.equity / follower.masterEquity) * sub.multiplier;
  } else {
    raw = signal.masterLot * sub.multiplier;
  }

  let rounded = roundLotToStep(raw);
  // Clamp, then re-check min — a clamp that drops below min means skip, never force a trade.
  if (rounded > sub.maxTradeLot) rounded = sub.maxTradeLot;
  if (rounded < sub.minTradeLot) return { skipped: `Sized lot ${rounded} below min ${sub.minTradeLot}.` };

  const side = sub.reverse ? (signal.side === "buy" ? "sell" : "buy") : signal.side;
  return { symbol: signal.symbol, side, volume: rounded, reason: signal.reason };
}
