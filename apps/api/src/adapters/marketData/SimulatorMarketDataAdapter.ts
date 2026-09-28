import type { Candle } from "@nouveau/core";
import type { MarketDataAdapter } from "./MarketDataAdapter";

/** Deterministic per-symbol seed — same symbol always produces the same
 *  candle shape (so a trader switching pairs and back sees a stable chart,
 *  same reasoning as apps/marketing's demoAnalyticsData.ts), without
 *  hardcoding a fixed pair list here. */
function seedFor(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) % 100000;
  }
  return (hash % 20) + 1;
}

function basePriceFor(symbol: string): number {
  // JPY crosses trade around 100-150, not 0.5-2 — keeps simulated prices in
  // a plausible range without needing a real per-symbol price table.
  return symbol.toUpperCase().includes("JPY") ? 150 : 1.1;
}

/**
 * Synthetic OHLC candles — a drift term plus two sine components at
 * different periods, same "deterministic, not Math.random()" philosophy as
 * every other demo/simulator data source in this project. Good enough to
 * exercise the full signal pipeline end to end without a real market-data
 * vendor. Never use this in `TRADING_MODE=live` — `config/env.ts` already
 * refuses to boot with that combination.
 */
export class SimulatorMarketDataAdapter implements MarketDataAdapter {
  readonly provider = "simulator";

  async getRecentCandles(symbol: string, count: number): Promise<Candle[]> {
    const seed = seedFor(symbol);
    const basePrice = basePriceFor(symbol);
    const volatility = basePrice * 0.006;
    const now = Date.now();
    const candles: Candle[] = [];

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const drift = Math.sin(seed) * 0.4 * t;
      const wave1 = Math.sin(t * Math.PI * (2 + seed)) * 0.5;
      const wave2 = Math.sin(t * Math.PI * (7 + seed * 1.7)) * 0.18;
      const close = basePrice + volatility * (drift + wave1 + wave2);
      const open = i === 0 ? close : candles[i - 1]!.close;
      const high = Math.max(open, close) + volatility * 0.1;
      const low = Math.min(open, close) - volatility * 0.1;
      candles.push({
        timestamp: now - (count - i) * 60_000,
        open,
        high,
        low,
        close,
      });
    }

    return candles;
  }
}
