import type { MarketDataAdapter } from "../adapters/marketData/MarketDataAdapter";
import { WATCHLIST, type WatchlistInstrument } from "../config/marketWatchlist";

export interface LiveQuote {
  symbol: string;
  display: string;
  name: string;
  flag: string;
  region: string;
  market: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  timestamp: number;
  stale: boolean;
}

export interface MarketSession {
  region: string;
  market: string;
  flag: string;
  status: "open" | "closed";
  /** Milliseconds until the next open/close transition. Null when unknown. */
  closesInMs: number | null;
  label: string;
}

/**
 * Market open/close in minutes-from-midnight UTC. DST shifts are ignored on
 * purpose — this drives a header countdown ("closing in 4h 35m"), never
 * trading, so approximate is better than a timezone database dependency.
 */
const SESSIONS: { region: string; market: string; flag: string; openMin: number; closeMin: number }[] = [
  { region: "United States", market: "NYSE/NASDAQ", flag: "🇺🇸", openMin: 13 * 60 + 30, closeMin: 20 * 60 },
  { region: "United Kingdom", market: "LSE", flag: "🇬🇧", openMin: 8 * 60, closeMin: 16 * 60 + 30 },
  { region: "Hong Kong", market: "HKEX", flag: "🇭🇰", openMin: 1 * 60 + 30, closeMin: 8 * 60 },
  { region: "Japan", market: "JPX", flag: "🇯🇵", openMin: 0, closeMin: 6 * 60 },
  { region: "Switzerland", market: "SIX", flag: "🇨🇭", openMin: 8 * 60, closeMin: 16 * 60 + 30 },
];

function sessionStatus(nowUtcMin: number, openMin: number, closeMin: number): { open: boolean; nextInMs: number } {
  const DAY = 24 * 60;
  if (nowUtcMin >= openMin && nowUtcMin < closeMin) {
    return { open: true, nextInMs: (closeMin - nowUtcMin) * 60_000 };
  }
  const nextOpen = nowUtcMin < openMin ? openMin : openMin + DAY;
  return { open: false, nextInMs: (nextOpen - nowUtcMin) * 60_000 };
}

export function getMarketSessions(now = new Date()): MarketSession[] {
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  return SESSIONS.map((s) => {
    const { open, nextInMs } = sessionStatus(nowMin, s.openMin, s.closeMin);
    const hours = Math.floor(nextInMs / 3_600_000);
    const minutes = Math.floor((nextInMs % 3_600_000) / 60_000);
    return {
      region: s.region,
      market: s.market,
      flag: s.flag,
      status: open ? "open" : "closed",
      closesInMs: nextInMs,
      label: open ? `closing in ${hours}h ${minutes}m` : `opens in ${hours}h ${minutes}m`,
    };
  });
}

function quoteFromCandles(instrument: WatchlistInstrument, candles: { close: number; timestamp: number }[]): LiveQuote | null {
  if (candles.length === 0) return null;
  const latest = candles[candles.length - 1] as { close: number; timestamp: number };
  const first = candles[0] as { close: number; timestamp: number };
  const change = latest.close - first.close;
  return {
    symbol: instrument.symbol,
    display: instrument.display,
    name: instrument.name,
    flag: instrument.flag,
    region: instrument.region,
    market: instrument.market,
    price: latest.close,
    previousClose: first.close,
    change,
    changePercent: first.close === 0 ? 0 : (change / first.close) * 100,
    timestamp: latest.timestamp,
    stale: false,
  };
}

const QUOTE_CACHE_TTL_MS = 45_000;
const quoteCache = new Map<string, { at: number; quote: LiveQuote }>();

function cachedQuote(symbol: string): LiveQuote | null {
  const entry = quoteCache.get(symbol);
  if (!entry) return null;
  if (Date.now() - entry.at > QUOTE_CACHE_TTL_MS) return null;
  return { ...entry.quote, stale: true };
}

export function primeQuoteCache(quote: LiveQuote): void {
  quoteCache.set(quote.symbol, { at: Date.now(), quote });
}

export function getCachedQuotes(): LiveQuote[] {
  return [...quoteCache.values()].map((e) => ({ ...e.quote, stale: Date.now() - e.at > QUOTE_CACHE_TTL_MS }));
}

/** One REST round per instrument; failures fall back to the 45s cache so a
 *  single vendor hiccup never blanks the whole Wall Street strip. */
export async function getLiveQuotes(marketDataAdapter: MarketDataAdapter): Promise<{ quotes: LiveQuote[]; dataSource: string }> {
  const quotes: LiveQuote[] = [];
  for (const instrument of WATCHLIST) {
    try {
      const candles = await marketDataAdapter.getRecentCandles(instrument.symbol, 2);
      const quote = quoteFromCandles(instrument, candles);
      if (quote) {
        quoteCache.set(instrument.symbol, { at: Date.now(), quote });
        quotes.push(quote);
        continue;
      }
    } catch {
      // fall through to cache below
    }
    const fallback = cachedQuote(instrument.symbol);
    if (fallback) quotes.push(fallback);
  }
  return { quotes, dataSource: marketDataAdapter.provider };
}
