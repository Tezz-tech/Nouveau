export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type SignalBias = "buy" | "sell" | "hold";

export interface SignalComponents {
  shortMovingAverage: number;
  longMovingAverage: number;
  rsi: number;
  momentum: number;
}

/**
 * The output of `computeSignal`. Deliberately has no field that could ever
 * be mistaken for an executed order or an instruction to a broker — `bias`
 * and `confidence` are commentary on the market, not an action. Whatever
 * narrates this (see apps/api's NarrationAdapter) must stay just as
 * text-only: nothing downstream of this type should be able to place a
 * trade, only describe one.
 */
export interface SignalResult {
  bias: SignalBias;
  confidence: number; // 0..1
  components: SignalComponents;
}
