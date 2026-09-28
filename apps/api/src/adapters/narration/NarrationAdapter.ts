import type { SignalResult } from "@nouveau/core";

/**
 * Turns a `SignalResult` into plain English for the trader dashboard. This
 * interface's return type is a plain `string` on purpose — narration is
 * commentary on a decision `@nouveau/core`'s `computeSignal` already made,
 * never itself a source of the bias/confidence, and never able to carry an
 * order or instruction structurally. A real LLM implementation may only
 * ever be plugged in as a nicer sentence generator over that same fixed
 * input; it must never be given the ability to invent its own bias.
 */
export interface NarrationAdapter {
  readonly provider: string;
  narrate(signal: SignalResult, symbol: string): Promise<string>;
}
