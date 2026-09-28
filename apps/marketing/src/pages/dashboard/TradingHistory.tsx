import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { InfoBanner, PageHeading } from "./components/DashboardUI";
import { demoTrades, formatCents } from "@/lib/demoDashboardData";

export default function TradingHistory() {
  return (
    <>
      <Seo title="Trading history" description="Your Nouveau account's trading history." path="/dashboard/history" />
      <PageHeading>Trading history</PageHeading>
      <RiseIn index={1} className="mt-6">
        <InfoBanner>
          <strong className="font-text">Example account.</strong> Illustrative demo data, not real trading
          activity — there's no live broker connection yet.
        </InfoBanner>
      </RiseIn>
      <div className="mt-8 overflow-x-auto border border-navy-line/50">
        <table className="w-full min-w-[560px] border-collapse text-left text-small">
          <thead>
            <tr className="border-b border-navy-line/50 bg-navy text-caption uppercase tracking-[0.08em] text-slate-light">
              <th className="py-3 pl-4 pr-4 font-normal">Day</th>
              <th className="py-3 pr-4 font-normal">Instrument</th>
              <th className="py-3 pr-4 font-normal">Direction</th>
              <th className="py-3 pr-4 font-normal">Entry</th>
              <th className="py-3 pr-4 font-normal">Exit</th>
              <th className="py-3 pr-4 font-normal">P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {demoTrades.map((trade, i) => (
              <RiseIn
                key={`${trade.day}-${trade.instrument}`}
                as="tr"
                index={2 + i}
                className="border-b border-navy-line/25 last:border-0 hover:bg-navy/60"
              >
                <td className="py-3 pl-4 pr-4 text-slate-light">{trade.day}</td>
                <td className="py-3 pr-4 text-paper">{trade.instrument}</td>
                <td className={`py-3 pr-4 ${trade.direction === "Long" ? "text-gain" : "text-loss"}`}>{trade.direction}</td>
                <td className="py-3 pr-4 font-mono-figure text-paper">{trade.entryPrice.toFixed(4)}</td>
                <td className="py-3 pr-4 font-mono-figure text-paper">
                  {trade.exitPrice === null ? "Open" : trade.exitPrice.toFixed(4)}
                </td>
                <td className={`py-3 pr-4 font-mono-figure ${trade.pnlCents !== null && trade.pnlCents >= 0 ? "text-gain" : "text-loss"}`}>
                  {trade.pnlCents === null ? "—" : formatCents(trade.pnlCents)}
                </td>
              </RiseIn>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
