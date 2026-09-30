import type { Candle } from "@nouveau/core";
import type { MarketDataAdapter } from "../adapters/marketData/MarketDataAdapter";
import { HttpError } from "../middleware/errorHandler";

export interface MarketChatSnapshot {
  symbol: string;
  message: string;
  dataSource: string;
  priceSeries: { day: number; price: number }[];
  latest: { timestamp: number; open: number; high: number; low: number; close: number };
  changePercent: number;
  observedAt: number;
}

function summarize(symbol: string, candles: Candle[]): MarketChatSnapshot {
  const first = candles[0]!;
  const latest = candles[candles.length - 1]!;
  const high = Math.max(...candles.map((candle) => candle.high));
  const low = Math.min(...candles.map((candle) => candle.low));
  const changePercent = first.close === 0 ? 0 : ((latest.close - first.close) / first.close) * 100;
  const direction = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "unchanged";

  return {
    symbol,
    message: `${symbol} snapshot: latest close ${latest.close}; ${direction} ${Math.abs(changePercent).toFixed(3)}% across the returned candles. The period's high was ${high} and low was ${low}. This is price data, not a buy/sell recommendation.`,
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
  };
}

/** Return a factual OHLC snapshot for the investor/trader market-chat panel. */
export async function getMarketChatSnapshot(
  symbol: string,
  marketDataAdapter: MarketDataAdapter
): Promise<MarketChatSnapshot> {
  const candles = await marketDataAdapter.getRecentCandles(symbol, 60);
  if (candles.length === 0) {
    throw new HttpError(503, `No market data is available for ${symbol} yet.`);
  }
  const snapshot = summarize(symbol, candles);
  snapshot.dataSource = marketDataAdapter.provider;
  return snapshot;
}