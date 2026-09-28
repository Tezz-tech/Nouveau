import { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { DarkErrorBanner, PageHeading } from "./components/DashboardUI";
import { getTransactions, formatCents, type TransactionSummary } from "@/lib/ledgerApi";
import { ApiError } from "@/lib/api";

const KIND_LABEL: Record<string, string> = {
  deposit: "Deposit",
  withdrawal_requested: "Withdrawal requested",
  withdrawal_completed: "Withdrawal completed",
};

const KIND_TONE: Record<string, string> = {
  deposit: "text-gain",
  withdrawal_requested: "text-slate-light",
  withdrawal_completed: "text-loss",
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
      <PageHeading>Transactions</PageHeading>

      {error && (
        <div className="mt-6">
          <DarkErrorBanner message={error} />
        </div>
      )}

      {!transactions && !error && <p className="mt-6 text-body text-slate-light">Loading…</p>}

      {transactions && transactions.length === 0 && (
        <p className="mt-6 text-body text-slate-light">No transactions yet — deposit to get started.</p>
      )}

      {transactions && transactions.length > 0 && (
        <div className="mt-8 overflow-x-auto border border-navy-line/50">
          <table className="w-full min-w-[480px] border-collapse text-left text-small">
            <thead>
              <tr className="border-b border-navy-line/50 bg-navy text-caption uppercase tracking-[0.08em] text-slate-light">
                <th className="py-3 pl-4 pr-4 font-normal">Date</th>
                <th className="py-3 pr-4 font-normal">Type</th>
                <th className="py-3 pr-4 font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <RiseIn key={tx.reference} as="tr" index={i} className="border-b border-navy-line/25 last:border-0 hover:bg-navy/60">
                  <td className="py-3 pl-4 pr-4 text-slate-light">
                    {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-3 pr-4 text-paper">{KIND_LABEL[tx.kind] ?? tx.kind}</td>
                  <td className={`py-3 pr-4 font-mono-figure ${KIND_TONE[tx.kind] ?? "text-paper"}`}>{formatCents(tx.amountCents)}</td>
                </RiseIn>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
