import type { Candle } from "@nouveau/core";
import type { MarketDataAdapter } from "../adapters/marketData/MarketDataAdapter";
import { CachedMarketDataAdapter, VendorQuotaError } from "../adapters/marketData/CachedMarketDataAdapter";
import { HttpError } from "../middleware/errorHandler";

export interface MarketChatSnapshot {
  symbol: string;
  message: string;
  dataSource: string;
  priceSeries: { day: number; price: number }[];
  latest: { timestamp: number; open: number; high: number; low: number; close: number };
  changePercent: number;
  observedAt: number;
  /** True when the vendor rate-limited us and this is the last good snapshot. */
  stale: boolean;
}

function summarize(symbol: string, candles: Candle[], stale: boolean): MarketChatSnapshot {
  const first = candles[0]!;
  const latest = candles[candles.length - 1]!;
  const high = Math.max(...candles.map((candle) => candle.high));
  const low = Math.min(...candles.map((candle) => candle.low));
  const changePercent = first.close === 0 ? 0 : ((latest.close - first.close) / first.close) * 100;
  const direction = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "unchanged";
  const freshness = stale ? " Delayed snapshot — live data is temporarily rate-limited." : "";

  return {
    symbol,
    message: `${symbol} snapshot: latest close ${latest.close}; ${direction} ${Math.abs(changePercent).toFixed(3)}% across the returned candles. The period's high was ${high} and low was ${low}.${freshness} This is price data, not a buy/sell recommendation.`,
    dataSource: "unknown",
    priceSeries: candles.map((candle, day) => ({ day, price: candle.close })),
    latest: {
      timestamp: latest.timestamp,
      open: latest.open,
      high: latest.high,
      low: latest.low,
      close: latest.close,
    },
    changePercent,
    observedAt: Date.now(),
    stale,
  };
}

/** Return a factual OHLC snapshot for the investor/trader market-chat panel. */
export async function getMarketChatSnapshot(
  symbol: string,
  marketDataAdapter: MarketDataAdapter
): Promise<MarketChatSnapshot> {
  // Through the quota cache (5-min TTL per pair) so repeat views don't burn
  // Twelve Data credits; on 429 with no cache yet, 503 with a friendly
  // message instead of a raw 500.
  let candles: Candle[];
  let stale = false;
  if (marketDataAdapter instanceof CachedMarketDataAdapter) {
    try {
      ({ candles, stale } = await marketDataAdapter.getRecentCandlesWithMeta(symbol, 60));
    } catch (err) {
      if (err instanceof VendorQuotaError) {
        throw new HttpError(503, err.message);
      }
      throw err;
    }
  } else {
    candles = await marketDataAdapter.getRecentCandles(symbol, 60);
  }
  if (candles.length === 0) {
    throw new HttpError(503, `No market data is available for ${symbol} yet.`);
  }
  const snapshot = summarize(symbol, candles, stale);
  snapshot.dataSource = marketDataAdapter.provider;
  return snapshot;
}