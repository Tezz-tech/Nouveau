import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import { defaultRateLimit } from "../middleware/rateLimit";
import type { MarketDataAdapter } from "../adapters/marketData/MarketDataAdapter";
import { getLiveQuotes, getMarketSessions, getCachedQuotes, primeQuoteCache } from "../services/liveQuotesService";

/** Subscribers to the quotes broadcast — SSE (`GET /market/stream`). */
type QuoteSubscriber = (payload: string) => void;
const quoteSubscribers = new Set<QuoteSubscriber>();

export function broadcastQuotes(quotes: unknown, dataSource: string): void {
  const payload = `data: ${JSON.stringify({ type: "quotes", quotes, dataSource, at: Date.now() })}\n\n`;
  for (const send of quoteSubscribers) {
    try {
      send(payload);
    } catch {
      // a dead SSE socket must never break the broadcast loop
    }
  }
}

/**
 * Public live-market surface for the Overview "Wall Street strip".
 * `GET /market/quotes` is the polling fallback (45s server cache, ~60s
 * client poll), `GET /market/stream` is the live SSE channel, and
 * `GET /market/sessions` drives the per-region "closing in 4h 35m" labels.
 * Auth is required so the Twelve Data quota can't be burned anonymously.
 */
export function createMarketRouter(marketDataAdapter: MarketDataAdapter): Router {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/quotes",
    defaultRateLimit,
    asyncHandler(async (_req, res) => {
      const { quotes, dataSource } = await getLiveQuotes(marketDataAdapter);
      res.status(200).json({ quotes, dataSource, at: Date.now() });
    })
  );

  router.get(
    "/sessions",
    defaultRateLimit,
    asyncHandler(async (_req, res) => {
      res.status(200).json({ sessions: getMarketSessions(), at: Date.now() });
    })
  );

  router.get("/stream", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ type: "hello", at: Date.now() })}\n\n`);

    // Immediately send the last cached batch so the strip paints without
    // waiting for the next poll tick.
    const cached = getCachedQuotes();
    if (cached.length > 0) {
      res.write(`data: ${JSON.stringify({ type: "quotes", quotes: cached, dataSource: marketDataAdapter.provider, at: Date.now() })}\n\n`);
    }

    const send: QuoteSubscriber = (payload) => res.write(payload);
    quoteSubscribers.add(send);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        // socket already gone — cleanup below handles it
      }
    }, 20_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      quoteSubscribers.delete(send);
    });
  });

  return router;
}

/** Called by the poller below after each refresh so SSE clients stay live. */
export async function refreshQuotesOnce(marketDataAdapter: MarketDataAdapter): Promise<void> {
  try {
    const { quotes, dataSource } = await getLiveQuotes(marketDataAdapter);
    for (const q of quotes) primeQuoteCache(q);
    broadcastQuotes(quotes, dataSource);
  } catch {
    // vendor outage — cached quotes keep serving; never throw from a timer
  }
}

let pollerStarted = false;

/** Single process-wide poller: every 60s refresh quotes and push to SSE. */
export function startMarketPoller(marketDataAdapter: MarketDataAdapter): void {
  if (pollerStarted) return;
  pollerStarted = true;
  void refreshQuotesOnce(marketDataAdapter);
  setInterval(() => {
    void refreshQuotesOnce(marketDataAdapter);
  }, 60_000);
}
