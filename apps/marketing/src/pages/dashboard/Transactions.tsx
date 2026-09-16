import Seo from "@/components/Seo";
import { demoTransactions, formatCents } from "@/lib/demoDashboardData";

export default function Transactions() {
  return (
    <>
      <Seo title="Transactions" description="Your Nouveau account transaction history." path="/dashboard/transactions" />
      <h1 className="font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
        Transactions
      </h1>
      <div className="mt-6 border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
        <strong className="font-text">Example account.</strong> Illustrative demo data, not a real transaction
        history.
      </div>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-small">
          <thead>
            <tr className="border-b border-navy-line/25 text-caption uppercase tracking-[0.06em] text-slate">
              <th className="py-3 pr-4 font-normal">Day</th>
              <th className="py-3 pr-4 font-normal">Type</th>
              <th className="py-3 pr-4 font-normal">Amount</th>
              <th className="py-3 font-normal">Balance after</th>
            </tr>
          </thead>
          <tbody>
            {demoTransactions.map((tx) => (
              <tr key={`${tx.day}-${tx.type}`} className="border-b border-navy-line/10">
                <td className="py-3 pr-4 text-slate">{tx.day}</td>
                <td className="py-3 pr-4 text-ink">{tx.type}</td>
                <td className="py-3 pr-4 font-mono-figure text-ink">
                  {tx.amountCents === 0 ? "—" : formatCents(tx.amountCents)}
                </td>
                <td className="py-3 font-mono-figure text-ink">{formatCents(tx.balanceAfterCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
