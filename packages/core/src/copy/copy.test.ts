import { describe, it, expect } from "vitest";
import {
  sizeCopyTrade,
  runAIGate,
  validateSubscriptionConfig,
  DEFAULT_SUBSCRIPTION,
  type MasterTradeSignal,
} from "./index";
import type { Candle } from "../signals";

function candlesUp(): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < 45; i++) {
    const close = 1.1 + i * 0.002;
    out.push({ timestamp: i, open: close - 0.001, high: close + 0.001, low: close - 0.002, close });
  }
  return out;
}

const baseSignal: MasterTradeSignal = {
  ticket: "m1",
  symbol: "EURUSD",
  side: "buy",
  masterLot: 1,
  entryPrice: 1.1,
  stopLoss: 1.09,
  takeProfit: 1.12,
  openedAt: new Date().toISOString(),
  strategyId: "s1",
  reason: "trend continuation",
  aiConfidence: 0.8,
};

describe("lot sizing", () => {
  it("multiplier 1 mirrors master lots", () => {
    const r = sizeCopyTrade(baseSignal, {
      userId: "u",
      login: "l",
      equity: 1000,
      masterEquity: 10000,
      subscription: DEFAULT_SUBSCRIPTION,
    });
    expect(r).toMatchObject({ symbol: "EURUSD", side: "buy", volume: 1 });
  });

  it("multiplier 0.5 halves, reverse flips side", () => {
    const r = sizeCopyTrade(baseSignal, {
      userId: "u",
      login: "l",
      equity: 1000,
      masterEquity: 10000,
      subscription: { ...DEFAULT_SUBSCRIPTION, multiplier: 0.5, reverse: true },
    });
    expect(r).toMatchObject({ side: "sell", volume: 0.5 });
  });

  it("blocks symbols outside allow-list", () => {
    const r = sizeCopyTrade(baseSignal, {
      userId: "u",
      login: "l",
      equity: 1000,
      masterEquity: 10000,
      subscription: { ...DEFAULT_SUBSCRIPTION, allowedSymbols: ["GBPUSD"] },
    });
    expect(r).toEqual({ skipped: expect.stringContaining("allow-list") });
  });

  it("rejects bad subscription configs", () => {
    expect(validateSubscriptionConfig({ ...DEFAULT_SUBSCRIPTION, multiplier: 0 })).toContain("Multiplier");
    expect(validateSubscriptionConfig({ ...DEFAULT_SUBSCRIPTION, mode: "fixed_lot" })).toContain("fixedLot");
  });
});

describe("AI gate", () => {
  it("blocks trades without a stop loss (invariant #3)", () => {
    const r = runAIGate({
      proposal: {
        symbol: "EURUSD",
        bias: "buy",
        confidence: 0.9,
        reason: "strong trend continuation expected here",
        requestedLot: 1,
        stopLossPips: null,
        takeProfitPips: 20,
      },
      candles: candlesUp(),
      openPositions: 0,
      maxOpenPositions: 5,
      dailyLossPct: 0,
      maxDailyLossPct: 5,
    });
    expect(r.verdict).toBe("block");
    expect(r.logReason).toContain("Stop loss");
  });

  it("logs hold proposals as no-trade, never executes", () => {
    const r = runAIGate({
      proposal: {
        symbol: "EURUSD",
        bias: "hold",
        confidence: 0.6,
        reason: "choppy market, waiting for confirmation",
        requestedLot: 1,
        stopLossPips: 20,
        takeProfitPips: 40,
      },
      candles: candlesUp(),
      openPositions: 0,
      maxOpenPositions: 5,
      dailyLossPct: 0,
      maxDailyLossPct: 5,
    });
    expect(r.verdict).toBe("block");
    expect(r.approvedLot).toBeNull();
  });

  it("blocks when max positions reached", () => {
    const r = runAIGate({
      proposal: {
        symbol: "EURUSD",
        bias: "buy",
        confidence: 0.9,
        reason: "strong trend continuation expected here",
        requestedLot: 1,
        stopLossPips: 20,
        takeProfitPips: 40,
      },
      candles: candlesUp(),
      openPositions: 5,
      maxOpenPositions: 5,
      dailyLossPct: 0,
      maxDailyLossPct: 5,
    });
    expect(r.verdict).toBe("block");
  });

  it("approves when AI agrees with a strong uptrend", () => {
    const r = runAIGate({
      proposal: {
        symbol: "EURUSD",
        bias: "buy",
        confidence: 0.9,
        reason: "strong trend continuation expected here",
        requestedLot: 1,
        stopLossPips: 20,
        takeProfitPips: 40,
      },
      candles: candlesUp(),
      openPositions: 0,
      maxOpenPositions: 5,
      dailyLossPct: 0,
      maxDailyLossPct: 5,
    });
    expect(["approve", "reduce"]).toContain(r.verdict);
    expect(r.approvedLot).not.toBeNull();
  });
});
