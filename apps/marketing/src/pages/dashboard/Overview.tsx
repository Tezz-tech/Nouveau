import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Seo from "@/components/Seo";
import ProgressBar from "@/components/ui/ProgressBar";
import RiseIn from "@/components/motion/RiseIn";
import { ErrorBanner } from "@/components/ui/FormField";
import { getOverview, getTransactions, formatCents, type Overview as OverviewData, type TransactionSummary } from "@/lib/ledgerApi";
import { ApiError } from "@/lib/api";

function SummaryCard({ label, value, hint, index }: { label: string; value: string; hint?: string; index: number }) {
  return (
    <RiseIn index={index}>
      <div className="border border-navy-line/25 bg-paper px-5 py-4 transition-all duration-300 ease-house hover:-translate-y-0.5 hover:border-gold-deep/40 hover:shadow-[0_8px_24px_-12px_rgba(14,28,43,0.25)]">
        <p className="text-caption uppercase tracking-[0.06em] text-slate">{label}</p>
        <p className="mt-1 font-mono-figure text-h3 text-ink">{value}</p>
        {hint && <p className="mt-1 text-caption text-slate">{hint}</p>}
      </div>
    </RiseIn>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-navy-line/40 bg-paper px-3 py-2 text-caption text-ink shadow-sm">
      {formatCents(String(Math.round(payload[0]!.value * 100)))}
    </div>
  );
}

/**
 * Real account data — GET /account/overview and /account/transactions,
 * computed by @nouveau/api from persisted ledger transactions, never
 * invented. The one thing still simulated is the payment capture behind a
 * deposit/withdrawal (see Funding.tsx/Withdraw.tsx) — no real bank
 * transfer moves until a real processor is connected, so the banner below
 * says so plainly rather than letting a real number imply real money.
 */
export default function Overview() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [transactions, setTransactions] = useState<TransactionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getOverview(), getTransactions()])
      .then(([o, t]) => {
        setOverview(o);
        setTransactions(t);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your account overview. Try again."));
  }, []);

  const totalDeposited = overview ? Number(overview.totalDepositedCents) : 0;
  const totalEquity = overview ? Number(overview.totalEquityCents) : 0;
  const target = overview?.targetCents ? Number(overview.targetCents) : null;
  const progressToTarget = target && target !== totalDeposited ? (totalEquity - totalDeposited) / (target - totalDeposited) : 0;

  const chartData = overview?.equitySeries.map((p, i) => ({ index: i, equity: Number(p.totalEquityCents) / 100 })) ?? [];

  return (
    <>
      <Seo title="Dashboard" description="Your Nouveau account overview." path="/dashboard" />

      <RiseIn>
        <div className="border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
          <strong className="font-text">Real account, simulated payments.</strong> The balances, chart, and
          transaction history below are computed live from your actual deposit/withdrawal history — but no
          payment processor is connected yet, so depositing or withdrawing doesn&rsquo;t move real money. Live
          broker trading isn&rsquo;t connected either, so equity only changes when you deposit or withdraw, not
          from trading activity yet.
        </div>
      </RiseIn>

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} />
        </div>
      )}

      <h1 className="mt-8 font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
        Account overview
      </h1>

      {!overview && !error && <p className="mt-6 text-body text-slate">Loading…</p>}

      {overview && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard index={1} label="Total equity" value={formatCents(overview.totalEquityCents)} />
            <SummaryCard
              index={2}
              label="Custody balance"
              value={formatCents(overview.custodyCents)}
              hint="Segregated — never traded"
            />
            <SummaryCard
              index={3}
              label="At-risk balance"
              value={formatCents(overview.atRiskCents)}
              hint="Trading sub-account"
            />
            <SummaryCard index={4} label="Cycle target" value={target ? formatCents(overview.targetCents!) : "—"} />
          </div>

          {target && (
            <RiseIn index={5} className="mt-4">
              <div className="flex items-center justify-between text-caption text-slate">
                <span>Progress to target</span>
                <span>{Math.round(Math.max(0, Math.min(1, progressToTarget)) * 100)}%</span>
              </div>
              <div className="mt-2">
                <ProgressBar fraction={Math.max(0, Math.min(1, progressToTarget))} />
              </div>
            </RiseIn>
          )}

          {chartData.length > 1 ? (
            <RiseIn index={6} className="mt-10 h-72 border border-navy-line/25 bg-paper p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8A6D1C" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8A6D1C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1D3E5C" strokeOpacity={0.12} vertical={false} />
                  <XAxis
                    dataKey="index"
                    tickFormatter={(i: number) => `#${i + 1}`}
                    stroke="#5C6E7E"
                    tick={{ fontSize: 12, fill: "#5C6E7E" }}
                    tickLine={false}
                    axisLine={{ stroke: "#1D3E5C", strokeOpacity: 0.2 }}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    stroke="#5C6E7E"
                    tick={{ fontSize: 12, fill: "#5C6E7E" }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#8A6D1C"
                    strokeWidth={2}
                    fill="url(#equityFill)"
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </RiseIn>
          ) : (
            <RiseIn index={6} className="mt-10 flex h-72 items-center justify-center border border-navy-line/25 bg-paper text-center text-body text-slate">
              Your equity chart appears once you have at least two account events — make a deposit to get started.
            </RiseIn>
          )}

          <h2 className="mt-10 font-display text-h3 text-ink">Recent activity</h2>
          {transactions && transactions.length === 0 && (
            <p className="mt-4 text-body text-slate">No activity yet — deposit to get started.</p>
          )}
          {transactions && transactions.length > 0 && (
            <ol className="mt-4 space-y-0">
              {transactions.slice(0, 8).map((entry, i) => (
                <RiseIn key={entry.reference} as="li" index={7 + i} className="relative flex gap-3 pb-6 last:pb-0">
                  {i < Math.min(transactions.length, 8) - 1 && (
                    <span className="absolute left-[5px] top-4 h-full w-px bg-navy-line/25" aria-hidden="true" />
                  )}
                  <span className="z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gold-deep" aria-hidden="true" />
                  <div>
                    <p className="text-small text-ink">
                      {entry.description}{" "}
                      <span className="text-caption text-slate">
                        — {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </p>
                  </div>
                </RiseIn>
              ))}
            </ol>
          )}
        </>
      )}
    </>
  );
}
