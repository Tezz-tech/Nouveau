import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Seo from "@/components/Seo";
import ProgressBar from "@/components/ui/ProgressBar";
import RiseIn from "@/components/motion/RiseIn";
import { getOverview, getTransactions, formatCents, type Overview as OverviewData, type TransactionSummary } from "@/lib/ledgerApi";
import { ApiError } from "@/lib/api";
import { Card, DarkErrorBanner, InfoBanner, PageHeading, SectionHeading, StatTile } from "./components/DashboardUI";
import MarketChat from "./MarketChat";

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-navy-line bg-navy px-3 py-2 text-caption text-paper shadow-lg">
      {formatCents(String(Math.round(payload[0]!.value * 100)))}
    </div>
  );
}

function formatCentsNumber(cents: number): string {
  return formatCents(String(Math.round(cents)));
}

const ACTIVITY_DOT_TONE: Record<string, string> = {
  deposit: "bg-gain",
  withdrawal_requested: "bg-slate-light",
  withdrawal_completed: "bg-loss",
};

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
  const equityDeltaPct = totalDeposited > 0 ? ((totalEquity - totalDeposited) / totalDeposited) * 100 : null;

  const chartData = overview?.equitySeries.map((p, i) => ({ index: i, equity: Number(p.totalEquityCents) / 100 })) ?? [];
  const sparklinePoints = overview?.equitySeries.map((p) => Number(p.totalEquityCents)) ?? [];

  return (
    <>
      <Seo title="Dashboard" description="Your Nouveau account overview." path="/dashboard" />

      <InfoBanner>
        <strong className="font-text">Real account, simulated payments.</strong> The balances, chart, and
        transaction history below are computed live from your actual deposit/withdrawal history — but no
        payment processor is connected yet, so depositing or withdrawing doesn&rsquo;t move real money. Live
        broker trading isn&rsquo;t connected either, so equity only changes when you deposit or withdraw, not
        from trading activity yet.
      </InfoBanner>

      {error && (
        <div className="mt-6">
          <DarkErrorBanner message={error} />
        </div>
      )}

      <div className="mt-8">
        <PageHeading>Account overview</PageHeading>
      </div>

      <section className="mt-8" aria-label="Live forex market feed">
        <MarketChat compact />
      </section>

      {!overview && !error && <p className="mt-6 text-body text-slate-light">Loading…</p>}

      {overview && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              index={1}
              icon="overview"
              tone="gold"
              label="Total equity"
              valueCents={totalEquity}
              format={formatCentsNumber}
              delta={equityDeltaPct}
              sparkline={sparklinePoints}
            />
            <StatTile
              index={2}
              icon="custody"
              tone="info"
              label="Custody balance"
              valueCents={Number(overview.custodyCents)}
              format={formatCentsNumber}
              hint="Segregated — never traded"
            />
            <StatTile
              index={3}
              icon="atRisk"
              tone="gain"
              label="At-risk balance"
              valueCents={Number(overview.atRiskCents)}
              format={formatCentsNumber}
              hint="Trading sub-account"
            />
            <StatTile
              index={4}
              icon="target"
              tone="gold"
              label="Cycle target"
              valueCents={target}
              format={formatCentsNumber}
            />
          </div>

          {target && (
            <RiseIn index={5} className="mt-4">
              <div className="flex items-center justify-between text-caption text-slate-light">
                <span>Progress to target</span>
                <span className="font-mono-figure">{Math.round(Math.max(0, Math.min(1, progressToTarget)) * 100)}%</span>
              </div>
              <div className="mt-2">
                <ProgressBar fraction={Math.max(0, Math.min(1, progressToTarget))} tone="dark" />
              </div>
            </RiseIn>
          )}

          {chartData.length > 1 ? (
            <RiseIn index={6} className="mt-8">
              <Card className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C9A227" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1D3E5C" strokeOpacity={0.4} vertical={false} />
                    <XAxis
                      dataKey="index"
                      tickFormatter={(i: number) => `#${i + 1}`}
                      stroke="#1D3E5C"
                      tick={{ fontSize: 12, fill: "#8B98A2" }}
                      tickLine={false}
                      axisLine={{ stroke: "#1D3E5C" }}
                      interval="preserveStartEnd"
                      minTickGap={40}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                      stroke="#1D3E5C"
                      tick={{ fontSize: 12, fill: "#8B98A2" }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#C9A227"
                      strokeWidth={2}
                      fill="url(#equityFill)"
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </RiseIn>
          ) : (
            <RiseIn index={6} className="mt-8">
              <Card className="flex h-72 items-center justify-center text-center text-body text-slate-light">
                Your equity chart appears once you have at least two account events — make a deposit to get
                started.
              </Card>
            </RiseIn>
          )}

          <div className="mt-10">
            <SectionHeading>Recent activity</SectionHeading>
          </div>
          {transactions && transactions.length === 0 && (
            <p className="mt-4 text-body text-slate-light">No activity yet — deposit to get started.</p>
          )}
          {transactions && transactions.length > 0 && (
            <ol className="mt-4 space-y-0">
              {transactions.slice(0, 8).map((entry, i) => (
                <RiseIn key={entry.reference} as="li" index={7 + i} className="relative flex gap-3 pb-6 last:pb-0">
                  {i < Math.min(transactions.length, 8) - 1 && (
                    <span className="absolute left-[5px] top-4 h-full w-px bg-navy-line/50" aria-hidden="true" />
                  )}
                  <span
                    className={`z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${ACTIVITY_DOT_TONE[entry.kind] ?? "bg-gold"}`}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-small text-paper">
                      {entry.description}{" "}
                      <span className="text-caption text-slate-light">
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

