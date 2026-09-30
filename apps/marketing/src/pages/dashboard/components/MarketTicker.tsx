import RiseIn from "@/components/motion/RiseIn";
import { Card, SectionHeading, LiveDot } from "../components/DashboardUI";
import { useLiveMarket } from "../hooks/useLiveMarket";

export function formatPrice(value: number, symbol: string): string {
  const decimals = symbol.includes("JPY") ? 2 : symbol.includes("/") ? 5 : 2;
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCountdown(ms: number | null): string {
  if (ms == null) return "";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export default function MarketTicker() {
  const { quotes, sessions, dataSource, connection, updatedAt } = useLiveMarket();
  const ordered = [...sessions].sort((a, b) =>
    a.region === "United States" ? -1 : b.region === "United States" ? 1 : 0
  );
  const us = sessions.find((s) => s.region === "United States");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-navy-line/30 pb-3">
        <span className="flex items-center gap-2 text-caption uppercase tracking-[0.1em] text-slate-light">
          <LiveDot tone={connection === "live" ? "gain" : "gold"} />
          {connection === "live" ? "Live" : connection === "polling" ? "Live · polling" : "Connecting…"}
        </span>
        {ordered.map((s) => (
          <span key={s.region} className="flex items-center gap-1.5 text-caption text-slate-light">
            <span aria-hidden="true">{s.flag}</span>
            <span className="text-paper">{s.region}</span>
            <span className={s.status === "open" ? "text-gain" : "text-loss"}>
              {s.status === "open" ? `closing in ${formatCountdown(s.closesInMs)}` : `opens in ${formatCountdown(s.closesInMs)}`}
            </span>
          </span>
        ))}
        <span className="ml-auto text-caption text-slate-light">
          {dataSource === "twelvedata" ? "Twelve Data" : dataSource === "simulator" ? "Simulated feed" : "Market feed"}
          {updatedAt ? ` · ${new Date(updatedAt).toLocaleTimeString()}` : ""}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {quotes.map((q, i) => (
          <RiseIn key={q.symbol} index={i}>
            <div className="flex items-center gap-3 border border-navy-line/50 bg-navy px-3 py-2.5">
              <span className="text-lg" aria-hidden="true">{q.flag}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono-figure text-small text-paper">
                  {q.display} <span className="text-caption text-slate-light">· {q.market}</span>
                </p>
                <p className="truncate text-caption text-slate-light">{q.name}</p>
              </div>
              <div className="text-right">
                <p className="font-mono-figure text-small text-paper">{formatPrice(q.price, q.symbol)}</p>
                <p className={`font-mono-figure text-caption ${q.changePercent >= 0 ? "text-gain" : "text-loss"}`}>
                  {q.changePercent >= 0 ? "+" : ""}{q.changePercent.toFixed(2)}%
                  {q.stale ? " · stale" : ""}
                </p>
              </div>
            </div>
          </RiseIn>
        ))}
        {quotes.length === 0 && <p className="text-body text-slate-light">Connecting to the live feed…</p>}
      </div>

      {us && (
        <p className="mt-2 text-caption text-slate-light">
          {us.flag} {us.region} {us.status === "open" ? "session" : "market"} {us.label} · {us.market}
        </p>
      )}

      <RiseIn index={7} className="mt-4">
        <Card>
          <SectionHeading>How live is this?</SectionHeading>
          <p className="mt-1 text-caption text-slate-light">
            Quotes stream over server-sent events and refresh every 60 seconds; Twelve Data is polled over REST by the
            API, not over WebSockets. A real always-on WebSocket needs a persistent host — this build stays
            serverless-safe.
          </p>
        </Card>
      </RiseIn>
    </div>
  );
}
