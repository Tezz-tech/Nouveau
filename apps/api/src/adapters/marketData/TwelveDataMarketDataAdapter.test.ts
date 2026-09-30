import { afterEach, describe, expect, it, vi } from "vitest";
import { TwelveDataMarketDataAdapter } from "./TwelveDataMarketDataAdapter";
import { CachedMarketDataAdapter, VendorQuotaError } from "./CachedMarketDataAdapter";
import type { Candle } from "@nouveau/core";

afterEach(() => {
  vi.unstubAllGlobals();
});

function candlesResponse(): Response {
  return new Response(
    JSON.stringify({
      status: "ok",
      values: [
        { datetime: "2026-09-30 12:02:00", open: "1.3", high: "1.4", low: "1.2", close: "1.35" },
        { datetime: "2026-09-30 12:01:00", open: "1.2", high: "1.3", low: "1.1", close: "1.25" },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

describe("TwelveDataMarketDataAdapter", () => {
  it("requests 1-minute candles and returns them oldest first", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(candlesResponse());
    const adapter = new TwelveDataMarketDataAdapter("test-api-key", fetchMock);

    const candles = await adapter.getRecentCandles("EUR/USD", 2);

    expect(adapter.provider).toBe("twelvedata");
    expect(candles.map((candle) => candle.close)).toEqual([1.25, 1.35]);
    expect(candles[0]?.timestamp).toBe(Date.parse("2026-09-30T12:01:00Z"));
    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestedUrl.searchParams.get("symbol")).toBe("EUR/USD");
    expect(requestedUrl.searchParams.get("interval")).toBe("1min");
    expect(requestedUrl.searchParams.get("outputsize")).toBe("2");
    expect(requestedUrl.searchParams.get("apikey")).toBe("test-api-key");
  });

  it("surfaces vendor errors and rejects invalid candle counts", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: "error", message: "Invalid symbol." }), { status: 200 })
    );
    const adapter = new TwelveDataMarketDataAdapter("test-api-key", fetchMock);

    await expect(adapter.getRecentCandles("INVALID/PAIR", 20)).rejects.toThrow("Invalid symbol.");
    await expect(adapter.getRecentCandles("EUR/USD", 0)).rejects.toThrow(RangeError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps HTTP 429 and quota messages to VendorQuotaError", async () => {
    const http429 = new TwelveDataMarketDataAdapter(
      "test-api-key",
      vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 429 }))
    );
    await expect(http429.getRecentCandles("EUR/USD", 2)).rejects.toBeInstanceOf(VendorQuotaError);

    const quotaBody = new TwelveDataMarketDataAdapter(
      "test-api-key",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ status: "error", message: "API calls quota exceeded!" }), { status: 200 })
      )
    );
    await expect(quotaBody.getRecentCandles("EUR/USD", 2)).rejects.toBeInstanceOf(VendorQuotaError);
  });
});

describe("CachedMarketDataAdapter", () => {
  const sample: Candle[] = [{ timestamp: 1, open: 1, high: 1, low: 1, close: 1 }];

  it("caches repeats and dedupes concurrent callers into one vendor call", async () => {
    const inner = { provider: "twelvedata", getRecentCandles: vi.fn(async () => sample) };
    const adapter = new CachedMarketDataAdapter(inner, 60_000);

    const [a, b] = await Promise.all([adapter.getRecentCandles("EUR/USD", 60), adapter.getRecentCandles("EUR/USD", 60)]);
    expect(a).toBe(sample);
    expect(b).toBe(sample);
    expect(inner.getRecentCandles).toHaveBeenCalledTimes(1);

    await adapter.getRecentCandles("EUR/USD", 60);
    expect(inner.getRecentCandles).toHaveBeenCalledTimes(1);
  });

  it("serves stale cache when the vendor rate-limits", async () => {
    let calls = 0;
    const inner = {
      provider: "twelvedata",
      getRecentCandles: vi.fn(async () => {
        calls += 1;
        if (calls === 1) return sample;
        throw new VendorQuotaError("quota");
      }),
    };
    const adapter = new CachedMarketDataAdapter(inner, 0);

    await adapter.getRecentCandles("EUR/USD", 60);
    const stale = await adapter.getRecentCandles("EUR/USD", 60);
    expect(stale).toBe(sample);
    const meta = await adapter.getRecentCandlesWithMeta("EUR/USD", 60);
    expect(meta.stale).toBe(true);
  });

  it("throws quota errors when there is nothing cached yet", async () => {
    const inner = {
      provider: "twelvedata",
      getRecentCandles: vi.fn(async (): Promise<Candle[]> => {
        throw new VendorQuotaError("quota");
      }),
    };
    const adapter = new CachedMarketDataAdapter(inner, 60_000);
    await expect(adapter.getRecentCandles("EUR/USD", 60)).rejects.toBeInstanceOf(VendorQuotaError);
  });
});
