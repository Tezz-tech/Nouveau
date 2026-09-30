import { api } from "./api";

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
  closesInMs: number | null;
  label: string;
}

export interface QuotesResponse {
  quotes: LiveQuote[];
  dataSource: string;
  at: number;
}

export function getQuotes(): Promise<QuotesResponse> {
  return api.get<QuotesResponse>("/market/quotes");
}

export function getSessions(): Promise<{ sessions: MarketSession[]; at: number }> {
  return api.get<{ sessions: MarketSession[]; at: number }>("/market/sessions");
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

/**
 * Live quotes over SSE (`GET /market/stream`). Cookies can't be set on an
 * EventSource by hand, so `{ withCredentials: true }` lets the browser send
 * the session cookie it already has. Returns an unsubscribe function. The
 * hook in `hooks/useLiveMarket.ts` owns reconnect + polling fallback — this
 * is just the one-shot subscription primitive.
 */
export function subscribeToQuotes(onQuotes: (quotes: LiveQuote[], dataSource: string) => void): () => void {
  const source = new EventSource(`${API_BASE_URL}/market/stream`, { withCredentials: true });
  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data as string) as
        | { type: "quotes"; quotes: LiveQuote[]; dataSource: string }
        | { type: "hello"; at: number };
      if (payload.type === "quotes") onQuotes(payload.quotes, payload.dataSource);
    } catch {
      // a malformed SSE frame must never kill the stream
    }
  };
  source.onerror = () => {
    // hook handles fallback polling; keep the EventSource's own retry alive
  };
  return () => source.close();
}
