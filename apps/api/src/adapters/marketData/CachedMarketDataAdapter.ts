import type { Candle } from "@nouveau/core";
import type { MarketDataAdapter } from "./MarketDataAdapter";

/**
 * Quota guard in front of any real vendor adapter (Twelve Data's free tier
 * is ~8 credits/min, ~800/day — one credit per symbol per REST call).
 *
 * - Per-symbol TTL cache (default 5 min for 60-candle snapshots): repeat
 *   views of the same pair reuse candles instead of burning credits.
 * - In-flight dedupe: 10 users opening the same pair at once = 1 vendor
 *   call, not 10.
 * - Stale fallback: when the vendor 429s/5xxs, serve the last good candles
 *   marked stale instead of 500ing the dashboard.
 *
 * `stale: true` on the response means "served from cache because the vendor
 * said no" — the frontend shows the data with a "delayed" badge rather than
 * an error screen.
 */
export interface CachedCandles {
  candles: Candle[];
  stale: boolean;
}

interface Entry {
  at: number;
  candles: Candle[];
}

export class VendorQuotaError extends Error {
  constructor(message = "Market data is temporarily rate-limited. Showing the last available snapshot.") {
    super(message);
    this.name = "VendorQuotaError";
  }
}

export class CachedMarketDataAdapter implements MarketDataAdapter {
  readonly provider: string;

  private readonly cache = new Map<string, Entry>();
  private readonly inFlight = new Map<string, Promise<Candle[]>>();

  constructor(
    private readonly inner: MarketDataAdapter,
    private readonly ttlMs = 5 * 60_000
  ) {
    this.provider = inner.provider;
  }

  /** The wrapped vendor adapter — lets callers bypass the cache in tests. */
  unwrap(): MarketDataAdapter {
    return this.inner;
  }

  private key(symbol: string, count: number): string {
    return `${symbol}::${count}`;
  }

  /** Last good candles for `symbol`/`count`, if any — even past TTL. */
  peek(symbol: string, count: number): Candle[] | null {
    return this.cache.get(this.key(symbol, count))?.candles ?? null;
  }

  async getRecentCandles(symbol: string, count: number): Promise<Candle[]> {
    const key = this.key(symbol, count);
    const now = Date.now();

    const hit = this.cache.get(key);
    if (hit && now - hit.at < this.ttlMs) return hit.candles;

    const ongoing = this.inFlight.get(key);
    if (ongoing) return ongoing;

    const fetch = this.inner
      .getRecentCandles(symbol, count)
      .then((candles) => {
        this.cache.set(key, { at: Date.now(), candles });
        return candles;
      })
      .catch((err: unknown) => {
        const stale = this.cache.get(key)?.candles;
        if (stale && isQuotaLike(err)) return stale;
        throw err;
      })
      .finally(() => {
        if (this.inFlight.get(key) === fetch) this.inFlight.delete(key);
      });

    this.inFlight.set(key, fetch);
    return fetch;
  }

  /** Same as getRecentCandles but reports whether the result is stale. */
  async getRecentCandlesWithMeta(symbol: string, count: number): Promise<CachedCandles> {
    const key = this.key(symbol, count);
    const before = this.cache.get(key);
    const candles = await this.getRecentCandles(symbol, count);
    const after = this.cache.get(key);
    // Stale when we served pre-existing cache rather than fresh vendor data:
    // either the vendor failed this round (cache entry untouched) or the
    // entry is past TTL but still the best we've got.
    const stale =
      (before != null && after?.candles === before.candles && Date.now() - before.at >= this.ttlMs) ||
      (after != null && Date.now() - after.at >= this.ttlMs);
    return { candles, stale };
  }
}

function isQuotaLike(err: unknown): boolean {
  if (err instanceof VendorQuotaError) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /429|rate.?limit|quota|too many requests|5\d\d/i.test(message);
}
