import { useEffect, useRef, useState, type FormEvent } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { ApiError } from "@/lib/api";
import { askMarketChat, TRADER_PAIRS, type MarketChatResponse } from "@/lib/signalsApi";
import { Card, DarkErrorBanner, InfoBanner, PageHeading, SectionHeading } from "./components/DashboardUI";

type ChatMessage = { role: "user" | "assistant"; content: string };

function PriceTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return <div className="border border-navy-line bg-navy px-3 py-2 font-mono-figure text-caption text-paper">{payload[0]!.value}</div>;
}

/** Informational pair chat for both account types. It reports OHLC facts only;
 *  it is not the trader signal engine and cannot affect investor funds/trading. */
export default function MarketChat({ compact = false }: { compact?: boolean }) {
  const [pairSymbol, setPairSymbol] = useState(TRADER_PAIRS[0]!.symbol);
  const [question, setQuestion] = useState("");
  const [snapshot, setSnapshot] = useState<MarketChatResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  async function ask(symbol: string, prompt: string, appendQuestion: boolean, silent = false) {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    if (appendQuestion) setMessages((current) => [...current, { role: "user", content: prompt }]);

    try {
      const result = await askMarketChat(symbol, prompt);
      if (currentRequest !== requestId.current) return;
      setSnapshot(result);
      if (!silent) {
        setMessages((current) => [
          ...current,
          ...(!appendQuestion ? [{ role: "user" as const, content: `Show me the latest ${symbol} market snapshot.` }] : []),
          { role: "assistant", content: result.message },
        ]);
      }
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      setError(err instanceof ApiError ? err.message : "Couldn't load market data. Please try again.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    void ask(pairSymbol, `Show me the latest ${pairSymbol} market snapshot.`, false);
    // Basic free API quota is limited; refresh the selected pair every two minutes.
    const refreshId = window.setInterval(() => {
      void ask(pairSymbol, `Refresh the ${pairSymbol} market snapshot.`, false, true);
    }, 120_000);
    return () => {
      window.clearInterval(refreshId);
      requestId.current += 1;
    };
    // Pair changes fetch immediately and restart the refresh timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairSymbol]);

  function submitQuestion(event: FormEvent) {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || loading) return;
    setQuestion("");
    void ask(pairSymbol, prompt, true);
  }

  function selectPair(symbol: string) {
    if (symbol === pairSymbol) return;
    setPairSymbol(symbol);
    setSnapshot(null);
  }

  return (
    <>
      {!compact && <Seo title="Market chat" description="Ask for factual forex price snapshots from recent market candles." path="/dashboard/market-chat" />}
      <InfoBanner>
        <strong className="font-text">Market data, not trade instructions.</strong> This chat summarizes recent candle prices only. It does not recommend trades, place orders, or change your deposited funds or managed strategy.
      </InfoBanner>

      <div className={`${compact ? "mt-0" : "mt-8"} flex flex-wrap items-end justify-between gap-4`}>
        <PageHeading>{compact ? "Live market chat" : "Market chat"}</PageHeading>
        <label className="text-caption text-slate-light">
          Currency pair
          <select
            aria-label="Currency pair"
            value={pairSymbol}
            onChange={(event) => selectPair(event.target.value)}
            className="ml-3 border border-navy-line bg-navy px-3 py-2 font-mono-figure text-small text-paper outline-none focus:border-gold"
          >
            {TRADER_PAIRS.map((pair) => <option key={pair.symbol} value={pair.symbol}>{pair.symbol} — {pair.name}</option>)}
          </select>
        </label>
      </div>

      {snapshot?.dataSource === "simulator" && (
        <div className="mt-5 border border-navy-line/50 bg-navy px-4 py-3 text-caption text-slate-light">
          Showing simulated candles. Configure Twelve Data on the API server to fetch vendor market data.
        </div>
      )}
      {snapshot?.dataSource === "twelvedata" && (
        <div className="mt-5 border border-gain/30 bg-navy px-4 py-3 text-caption text-slate-light">
          Price data from Twelve Data. This is a recent candle snapshot, not a streaming/live tick feed.
        </div>
      )}
      {error && <div className="mt-5"><DarkErrorBanner message={error} /></div>}

      <div className={`${compact ? "mt-4" : "mt-6"} grid gap-6 ${compact ? "xl:grid-cols-[1.5fr_1fr]" : "lg:grid-cols-[1.5fr_1fr]"}`}>
        <RiseIn>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <SectionHeading>{pairSymbol} price chart</SectionHeading>
                <p className="mt-1 text-caption text-slate-light">Most recent 60 one-minute candles · refreshes every 2 minutes{snapshot ? ` · updated ${new Date(snapshot.observedAt).toLocaleTimeString()}` : ""}</p>
              </div>
              <button type="button" disabled={loading} onClick={() => void ask(pairSymbol, "Refresh the market snapshot.", true)} className="border border-navy-line px-3 py-2 text-caption text-paper transition hover:border-gold disabled:opacity-50">
                {loading ? "Fetching…" : "Refresh data"}
              </button>
            </div>
            <div className="mt-5 h-72" aria-label={`${pairSymbol} recent market price chart`}>
              {snapshot ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snapshot.priceSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="marketChatFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C9A227" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1D3E5C" strokeOpacity={0.5} vertical={false} />
                    <XAxis dataKey="day" tickFormatter={(index: number) => `${index + 1}`} stroke="#1D3E5C" tick={{ fontSize: 11, fill: "#8B98A2" }} tickLine={false} />
                    <YAxis domain={["auto", "auto"]} width={72} tick={{ fontSize: 11, fill: "#8B98A2" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<PriceTooltip />} />
                    <Area type="monotone" dataKey="price" stroke="#C9A227" strokeWidth={2} fill="url(#marketChatFill)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-caption text-slate-light">{loading ? "Loading market candles…" : "Select a pair to load market data."}</div>
              )}
            </div>
            {snapshot && (
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-navy-line/40 pt-4 text-caption sm:grid-cols-4">
                <div><dt className="text-slate-light">Latest close</dt><dd className="mt-1 font-mono-figure text-paper">{snapshot.latest.close}</dd></div>
                <div><dt className="text-slate-light">1-minute high</dt><dd className="mt-1 font-mono-figure text-paper">{snapshot.latest.high}</dd></div>
                <div><dt className="text-slate-light">1-minute low</dt><dd className="mt-1 font-mono-figure text-paper">{snapshot.latest.low}</dd></div>
                <div><dt className="text-slate-light">Returned-window change</dt><dd className={`mt-1 font-mono-figure ${snapshot.changePercent >= 0 ? "text-gain" : "text-loss"}`}>{snapshot.changePercent >= 0 ? "+" : ""}{snapshot.changePercent.toFixed(3)}%</dd></div>
              </dl>
            )}
          </Card>
        </RiseIn>

        <RiseIn index={1}>
          <Card className={`flex ${compact ? "min-h-[21rem]" : "min-h-[25rem]"} flex-col`}>
            <SectionHeading>Market data assistant</SectionHeading>
            <p className="mt-1 text-caption text-slate-light">Ask for a factual snapshot. Replies are generated from the latest returned candles, not an AI model.</p>
            <div className="mt-5 flex-1 space-y-3 overflow-y-auto" aria-live="polite" aria-label="Market chat messages">
              {messages.map((message, index) => (
                <div key={`${index}-${message.role}`} className={`max-w-[95%] px-3 py-2.5 text-small ${message.role === "user" ? "ml-auto bg-gold/15 text-paper" : "mr-auto border border-navy-line/50 bg-navy text-paper"}`}>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.1em] text-slate-light">{message.role === "user" ? "You" : "Market assistant"}</p>
                  <p>{message.content}</p>
                </div>
              ))}
              {loading && <p className="text-caption text-slate-light">Fetching recent candles…</p>}
            </div>
            <form onSubmit={submitQuestion} className="mt-5 flex gap-2 border-t border-navy-line/40 pt-4">
              <input
                aria-label="Ask about the market snapshot"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={300}
                placeholder="Ask for a market snapshot…"
                className="min-w-0 flex-1 border border-navy-line bg-navy-deep px-3 py-2.5 text-small text-paper placeholder:text-slate-light/60 outline-none focus:border-gold"
              />
              <button type="submit" disabled={loading || !question.trim()} className="bg-gold px-4 py-2.5 text-small font-medium text-navy-deep disabled:cursor-not-allowed disabled:opacity-50">Ask</button>
            </form>
          </Card>
        </RiseIn>
      </div>
    </>
  );
}
