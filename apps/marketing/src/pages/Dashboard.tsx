import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Seo from "@/components/Seo";
import { LogoLockup } from "@/components/ui/Logo";
import { useAuth } from "@/lib/AuthContext";
import { demoAccount, demoActivity, demoEquitySeries, formatCents } from "@/lib/demoDashboardData";

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-navy-line/25 bg-paper px-5 py-4">
      <p className="text-caption uppercase tracking-[0.06em] text-slate">{label}</p>
      <p className="mt-1 font-mono-figure text-h3 text-ink">{value}</p>
      {hint && <p className="mt-1 text-caption text-slate">{hint}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-navy-line/40 bg-paper px-3 py-2 text-caption text-ink shadow-sm">
      {formatCents(payload[0]!.value)}
    </div>
  );
}

export default function Dashboard() {
  const { loading, authenticated, onboarding, userId, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (onboarding && onboarding.nextStep !== "complete") {
      navigate("/onboarding", { replace: true });
    }
  }, [loading, authenticated, onboarding, navigate]);

  if (loading || !authenticated || onboarding?.nextStep !== "complete") {
    return <div className="p-6 text-body text-slate">Loading…</div>;
  }

  const chartData = demoEquitySeries.map((p) => ({ day: p.day, equity: p.equityCents / 100 }));

  return (
    <>
      <Seo title="Dashboard" description="Your Nouveau account overview." path="/dashboard" />

      <header className="border-b border-navy-line/15 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-5">
          <Link to="/" aria-label="Nouveau — home">
            <LogoLockup tone="light" />
          </Link>
          <div className="flex items-center gap-6 text-small text-slate">
            {userId && <span className="hidden sm:inline">Signed in</span>}
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              className="text-ink underline decoration-navy-line underline-offset-4"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
          <strong className="font-text">Example account.</strong> This page shows illustrative demo data, not a
          real balance — deposits, live trading, and real account data arrive in a later phase of this build.
        </div>

        <h1 className="mt-8 font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
          Account overview
        </h1>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard label="Total equity" value={formatCents(demoAccount.totalEquityCents)} />
          <SummaryCard
            label="Custody balance"
            value={formatCents(demoAccount.custodyCents)}
            hint="Segregated — never traded"
          />
          <SummaryCard label="At-risk balance" value={formatCents(demoAccount.atRiskCents)} hint="Trading sub-account" />
          <SummaryCard label="Cycle target" value={formatCents(demoAccount.targetCents)} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-caption text-slate">
            <span>Progress to target</span>
            <span>{Math.round(demoAccount.progressToTarget * 100)}%</span>
          </div>
          <div className="mt-2 h-1 w-full bg-paper-2">
            <div
              className="h-1 bg-gold-deep transition-all duration-300 ease-house"
              style={{ width: `${Math.min(100, Math.max(0, demoAccount.progressToTarget * 100))}%` }}
              role="progressbar"
              aria-valuenow={Math.round(demoAccount.progressToTarget * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        <div className="mt-10 h-72 border border-navy-line/25 bg-paper p-4">
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
                dataKey="day"
                tickFormatter={(d: number) => `Day ${d}`}
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
              <Area type="monotone" dataKey="equity" stroke="#8A6D1C" strokeWidth={2} fill="url(#equityFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <h2 className="mt-10 font-display text-h3 text-ink">Recent activity</h2>
        <ol className="mt-4 space-y-0">
          {demoActivity.map((entry, i) => (
            <li key={`${entry.day}-${entry.title}`} className="relative flex gap-3 pb-6 last:pb-0">
              {i < demoActivity.length - 1 && (
                <span className="absolute left-[5px] top-4 h-full w-px bg-navy-line/25" aria-hidden="true" />
              )}
              <span className="z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gold-deep" aria-hidden="true" />
              <div>
                <p className="text-small text-ink">
                  {entry.title} <span className="text-caption text-slate">— day {entry.day}</span>
                </p>
                <p className="mt-0.5 text-caption text-slate">{entry.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
