import type { Candle } from "@nouveau/core";
import type { MarketDataAdapter } from "./MarketDataAdapter";

interface TwelveDataCandle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
}

interface TwelveDataTimeSeriesResponse {
  status?: string;
  message?: string;
  values?: TwelveDataCandle[];
}

function parseTimestamp(datetime: string): number {
  // Twelve Data returns forex candle datetimes in UTC without a timezone suffix.
  const normalized = datetime.includes("T") ? datetime : datetime.replace(" ", "T");
  const utcDatetime = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`;
  const timestamp = new Date(utcDatetime).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new Error("Twelve Data returned a candle with an invalid datetime.");
  }
  return timestamp;
}

function parsePrice(value: string, field: string): number {
  const price = Number(value);
  if (!Number.isFinite(price)) {
    throw new Error(`Twelve Data returned an invalid ${field} price.`);
  }
  return price;
}

/** Fetches forex OHLC candles from Twelve Data for the deterministic signal engine. */
export class TwelveDataMarketDataAdapter implements MarketDataAdapter {
  readonly provider = "twelvedata";

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async getRecentCandles(symbol: string, count: number): Promise<Candle[]> {
    if (!Number.isInteger(count) || count < 1 || count > 5000) {
      throw new RangeError("Twelve Data candle count must be an integer from 1 to 5000.");
    }

    // Wall Street watchlist symbols may carry an exchange suffix ("0700/HKG",
    // "NESN/SIX", "7203/TYO"). Twelve Data wants those as separate `symbol`
    // + `exchange` params, while forex ("EUR/USD") goes as one symbol — so
    // split only when the part after "/" is not a 3-letter currency code.
    let requestSymbol = symbol;
    let exchange: string | undefined;
    const slash = symbol.indexOf("/");
    if (slash >= 0) {
      const head = symbol.slice(0, slash);
      const tail = symbol.slice(slash + 1);
      if (!/^[A-Za-z]{3}$/.test(tail)) {
        requestSymbol = head;
        exchange = { HKG: "HKEX", SIX: "SIX", TYO: "TYO", HKGEX: "HKEX" }[tail.toUpperCase()] ?? tail;
      }
    }

    const url = new URL("https://api.twelvedata.com/time_series");
    url.search = new URLSearchParams({
      symbol: requestSymbol,
      interval: "1min",
      outputsize: String(count),
      order: "ASC",
      apikey: this.apiKey,
      ...(exchange ? { exchange } : {}),
    }).toString();

    const response = await this.fetchImpl(url);
    if (!response.ok) {
      throw new Error(`Twelve Data request failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as TwelveDataTimeSeriesResponse;
    if (payload.status === "error" || !Array.isArray(payload.values)) {
      throw new Error(payload.message || "Twelve Data did not return candle data.");
    }

    return payload.values
      .map((candle) => ({
        timestamp: parseTimestamp(candle.datetime),
        open: parsePrice(candle.open, "open"),
        high: parsePrice(candle.high, "high"),
        low: parsePrice(candle.low, "low"),
        close: parsePrice(candle.close, "close"),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }
}