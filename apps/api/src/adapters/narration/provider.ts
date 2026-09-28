import { getEnv } from "../../config/env";
import type { NarrationAdapter } from "./NarrationAdapter";
import { TemplatedNarrationAdapter } from "./TemplatedNarrationAdapter";

let cached: NarrationAdapter | undefined;

export function getNarrationAdapter(): NarrationAdapter {
  if (!cached) {
    const env = getEnv();
    if (env.LLM_NARRATION_PROVIDER === "anthropic") {
      throw new Error(
        "LLM_NARRATION_PROVIDER=anthropic has no adapter implementation yet — this is a Phase 2 addition, and even then it may only narrate computeSignal's output, never decide the bias itself."
      );
    }
    cached = new TemplatedNarrationAdapter();
  }
  return cached;
}

export function resetNarrationAdapterCache(): void {
  cached = undefined;
}
