import { computeSignal, type Candle } from "../signals";

/**
 * The "AI" in AI copy-trading — and the invariant #8 boundary.
 * The LLM/AI NEVER places a trade: it produces a JSON proposal.
 * This deterministic gate decides whether the proposal may reach the master.
 * Pure logic, no I/O, so it can be tested exhaustively.
 */
export type AIVerdict = "approve" | "reduce" | "block";

export interface AITradeProposal {
  symbol: string;
  bias: "buy" | "sell" | "hold";
  confidence: number; // 0..1
  reason: string;
  requestedLot: number;
  stopLossPips: number | null;
  takeProfitPips: number | null;
}

export interface AIGateInput {
  proposal: AITradeProposal;
  /** recent candles for the same symbol — technical confirmation */
  candles: readonly Candle[];
  /** account-level risk state */
  openPositions: number;
  maxOpenPositions: number;
  dailyLossPct: number;
  maxDailyLossPct: number;
}

export interface AIGateResult {
  verdict: AIVerdict;
  approvedLot: number | null;
  technicalBias: "buy" | "sell" | "hold";
  technicalConfidence: number;
  logReason: string;
}

export const AI_GATE_VERSION = "ai-gate-v1";

export function validateProposal(p: AITradeProposal): string | null {
  if (!p.symbol || p.symbol.trim().length < 3) return "Symbol is required.";
  if (!["buy", "sell", "hold"].includes(p.bias)) return "Bias must be buy/sell/hold.";
  if (!Number.isFinite(p.confidence) || p.confidence < 0 || p.confidence > 1) return "Confidence must be 0..1.";
  if (!p.reason || p.reason.trim().length < 10) return "A written reason (>=10 chars) is required — invariant #6.";
  if (!Number.isFinite(p.requestedLot) || p.requestedLot <= 0 || p.requestedLot > 10) {
    return "Requested lot must be > 0 and <= 10.";
  }
  // Invariant #3: every trade carries a stop loss.
  if (p.bias !== "hold" && (p.stopLossPips == null || p.stopLossPips <= 0)) {
    return "Stop loss is required on every trade (invariant #3).";
  }
  return null;
}

export function runAIGate(input: AIGateInput): AIGateResult {
  const { proposal, candles, openPositions, maxOpenPositions, dailyLossPct, maxDailyLossPct } = input;

  const shapeError = validateProposal(proposal);
  if (shapeError) {
    return {
      verdict: "block",
      approvedLot: null,
      technicalBias: "hold",
      technicalConfidence: 0,
      logReason: `BLOCKED: invalid proposal — ${shapeError}`,
    };
  }

  // "hold" proposals are logged as decisions-not-to-trade, never executed.
  if (proposal.bias === "hold") {
    return {
      verdict: "block",
      approvedLot: null,
      technicalBias: "hold",
      technicalConfidence: proposal.confidence,
      logReason: `NO-TRADE logged: AI proposed hold on ${proposal.symbol} — ${proposal.reason}`,
    };
  }

  // Account risk kill-switches first (deterministic, beat any AI opinion).
  if (openPositions >= maxOpenPositions) {
    return {
      verdict: "block",
      approvedLot: null,
      technicalBias: proposal.bias,
      technicalConfidence: proposal.confidence,
      logReason: `BLOCKED: max open positions reached (${openPositions}/${maxOpenPositions}).`,
    };
  }
  if (dailyLossPct >= maxDailyLossPct) {
    return {
      verdict: "block",
      approvedLot: null,
      technicalBias: proposal.bias,
      technicalConfidence: proposal.confidence,
      logReason: `BLOCKED: daily loss limit hit (${dailyLossPct}% >= ${maxDailyLossPct}%).`,
    };
  }

  // Technical confirmation via the audited indicator engine.
  let technicalBias: "buy" | "sell" | "hold" = "hold";
  let technicalConfidence = 0;
  try {
    const t = computeSignal(candles);
    technicalBias = t.bias;
    technicalConfidence = t.confidence;
  } catch {
    return {
      verdict: "block",
      approvedLot: null,
      technicalBias: "hold",
      technicalConfidence: 0,
      logReason: "BLOCKED: not enough market data for technical confirmation.",
    };
  }

  // AI and indicators disagree → no trade, but log the disagreement.
  if (technicalBias !== proposal.bias) {
    return {
      verdict: "block",
      approvedLot: null,
      technicalBias,
      technicalConfidence,
      logReason: `BLOCKED: AI said ${proposal.bias} (${Math.round(proposal.confidence * 100)}%) but indicators say ${technicalBias} (${Math.round(technicalConfidence * 100)}%) — disagreement means no trade.`,
    };
  }

  // Agreement: approve, but low combined confidence only earns half size.
  const combined = (proposal.confidence + technicalConfidence) / 2;
  if (combined < 0.45) {
    const half = Math.floor((proposal.requestedLot / 2) * 100) / 100;
    return {
      verdict: "reduce",
      approvedLot: half >= 0.01 ? half : null,
      technicalBias,
      technicalConfidence,
      logReason: `REDUCED: weak agreement (${Math.round(combined * 100)}%) — half size ${half} lots. AI: ${proposal.reason}`,
    };
  }

  return {
    verdict: "approve",
    approvedLot: proposal.requestedLot,
    technicalBias,
    technicalConfidence,
    logReason: `APPROVED: AI ${proposal.bias} ${proposal.symbol} ${proposal.requestedLot} lots (${Math.round(combined * 100)}% agreement). AI: ${proposal.reason}`,
  };
}
