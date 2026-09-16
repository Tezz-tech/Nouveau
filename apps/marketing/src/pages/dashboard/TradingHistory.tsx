import Seo from "@/components/Seo";
import { demoTrades, formatCents } from "@/lib/demoDashboardData";

export default function TradingHistory() {
  return (
    <>
      <Seo title="Trading history" description="Your Nouveau account's trading history." path="/dashboard/history" />
      <h1 className="font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
        Trading history
      </h1>
      <div className="mt-6 border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
        <strong className="font-text">Example account.</strong> Illustrative demo data, not real trading activity.
      </div>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-small">
          <thead>
            <tr className="border-b border-navy-line/25 text-caption uppercase tracking-[0.06em] text-slate">
              <th className="py-3 pr-4 font-normal">Day</th>
              <th className="py-3 pr-4 font-normal">Instrument</th>
              <th className="py-3 pr-4 font-normal">Direction</th>
              <th className="py-3 pr-4 font-normal">Entry</th>
              <th className="py-3 pr-4 font-normal">Exit</th>
              <th className="py-3 font-normal">P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {demoTrades.map((trade) => (
              <tr key={`${trade.day}-${trade.instrument}`} className="border-b border-navy-line/10">
                <td className="py-3 pr-4 text-slate">{trade.day}</td>
                <td className="py-3 pr-4 text-ink">{trade.instrument}</td>
                <td className="py-3 pr-4 text-ink">{trade.direction}</td>
                <td className="py-3 pr-4 font-mono-figure text-ink">{trade.entryPrice.toFixed(4)}</td>
                <td className="py-3 pr-4 font-mono-figure text-ink">
                  {trade.exitPrice === null ? "Open" : trade.exitPrice.toFixed(4)}
                </td>
                <td className="py-3 font-mono-figure text-ink">
                  {trade.pnlCents === null ? "—" : formatCents(trade.pnlCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
