import { useEffect, useRef, useState } from "react";
import { getQuotes, getSessions, subscribeToQuotes, type LiveQuote, type MarketSession } from "@/lib/marketApi";

export interface LiveMarketState {
  quotes: LiveQuote[];
  sessions: MarketSession[];
  dataSource: string | null;
  /** "live" = SSE connected, "polling" = REST fallback, "offline" = neither yet. */
  connection: "live" | "polling" | "offline";
  updatedAt: number | null;
}

/**
 * The Overview "Wall Street strip" data hook, shared by both tracks.
 * SSE (`GET /market/stream`) pushes quotes live; a 60s REST poll
 * (`GET /market/quotes`) covers SSE gaps (Vercel cold instances, dropped
 * sockets). Sessions refresh every 60s — they only drive countdown labels.
 */
export function useLiveMarket(): LiveMarketState {
  const [quotes, setQuotes] = useState<LiveQuote[]>([]);
  const [sessions, setSessions] = useState<MarketSession[]>([]);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [connection, setConnection] = useState<"live" | "polling" | "offline">("offline");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const seenLive = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const [quotesRes, sessionsRes] = await Promise.all([getQuotes(), getSessions()]);
        if (cancelled) return;
        setQuotes(quotesRes.quotes);
        setDataSource(quotesRes.dataSource);
        setSessions(sessionsRes.sessions);
        setUpdatedAt(Date.now());
        if (!seenLive.current) setConnection("polling");
      } catch {
        // vendor/API hiccup — keep the last batch on screen, never blank it
      }
    }

    void poll();
    const pollId = window.setInterval(poll, 60_000);

    const unsubscribe = subscribeToQuotes((next, source) => {
      if (cancelled) return;
      seenLive.current = true;
      setQuotes(next);
      setDataSource(source);
      setUpdatedAt(Date.now());
      setConnection("live");
    });

    // If no SSE frame arrives within 8s, admit we're on polling rather than
    // leaving the badge stuck on "connecting".
    const fallbackId = window.setTimeout(() => {
      if (!cancelled && !seenLive.current) setConnection((c) => (c === "offline" ? "polling" : c));
    }, 8_000);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearTimeout(fallbackId);
      unsubscribe();
    };
  }, []);

  return { quotes, sessions, dataSource, connection, updatedAt };
}
