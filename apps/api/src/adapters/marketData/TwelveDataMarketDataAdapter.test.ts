import { afterEach, describe, expect, it, vi } from "vitest";
import { TwelveDataMarketDataAdapter } from "./TwelveDataMarketDataAdapter";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TwelveDataMarketDataAdapter", () => {
  it("requests 1-minute candles and returns them oldest first", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          values: [
            { datetime: "2026-09-30 12:02:00", open: "1.3", high: "1.4", low: "1.2", close: "1.35" },
            { datetime: "2026-09-30 12:01:00", open: "1.2", high: "1.3", low: "1.1", close: "1.25" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
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
});