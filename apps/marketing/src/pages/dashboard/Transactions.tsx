import { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { ErrorBanner } from "@/components/ui/FormField";
import { getTransactions, formatCents, type TransactionSummary } from "@/lib/ledgerApi";
import { ApiError } from "@/lib/api";

const KIND_LABEL: Record<string, string> = {
  deposit: "Deposit",
  withdrawal_requested: "Withdrawal requested",
  withdrawal_completed: "Withdrawal completed",
};

/** Real transaction history — GET /account/transactions, every row a real
 *  persisted ledger event, not demo data. */
export default function Transactions() {
  const [transactions, setTransactions] = useState<TransactionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTransactions()
      .then(setTransactions)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your transactions. Try again."));
  }, []);

  return (
    <>
      <Seo title="Transactions" description="Your Nouveau account transaction history." path="/dashboard/transactions" />
      <h1 className="font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
        Transactions
      </h1>

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} />
        </div>
      )}

      {!transactions && !error && <p className="mt-6 text-body text-slate">Loading…</p>}

      {transactions && transactions.length === 0 && (
        <p className="mt-6 text-body text-slate">No transactions yet — deposit to get started.</p>
      )}

      {transactions && transactions.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-small">
            <thead>
              <tr className="border-b border-navy-line/25 text-caption uppercase tracking-[0.06em] text-slate">
                <th className="py-3 pr-4 font-normal">Date</th>
                <th className="py-3 pr-4 font-normal">Type</th>
                <th className="py-3 font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <RiseIn key={tx.reference} as="tr" index={i} className="border-b border-navy-line/10">
                  <td className="py-3 pr-4 text-slate">
                    {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-3 pr-4 text-ink">{KIND_LABEL[tx.kind] ?? tx.kind}</td>
                  <td className="py-3 font-mono-figure text-ink">{formatCents(tx.amountCents)}</td>
                </RiseIn>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
