import type { SignalResult } from "@nouveau/core";
import type { NarrationAdapter } from "./NarrationAdapter";

const BIAS_PHRASE: Record<SignalResult["bias"], string> = {
  buy: "leaning bullish",
  sell: "leaning bearish",
  hold: "showing no clear direction",
};

/**
 * No LLM call at all — a plain sentence built from the already-computed
 * signal. This is the default until `LLM_NARRATION_PROVIDER=anthropic` is
 * configured with a real API key; a real LLM implementation should only
 * ever narrate this exact same input more fluently, never decide the bias
 * itself.
 */
export class TemplatedNarrationAdapter implements NarrationAdapter {
  readonly provider = "template";

  async narrate(signal: SignalResult, symbol: string): Promise<string> {
    const { bias, confidence, components } = signal;
    const confidencePct = Math.round(confidence * 100);
    const trendWord = components.shortMovingAverage > components.longMovingAverage ? "above" : "below";

    return (
      `${symbol} is ${BIAS_PHRASE[bias]} (${confidencePct}% of the indicators we track agree). ` +
      `The short-term average is currently ${trendWord} the longer-term average, and RSI is at ${components.rsi.toFixed(1)}. ` +
      `This is automated commentary on market data, not personalized financial advice — you decide whether and when to act on it.`
    );
  }
}
