import { useEffect, useState } from "react";
import Seo from "@/components/seo/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { ApiError } from "@/lib/api";
import { getCopyStatus, subscribeCopy } from "@/lib/ledgerApi";
import { unsubscribeCopy, getCopyTrades } from "@/lib/ledgerApi";
import { getCopyDecisions, demoCopyTrade } from "@/lib/ledgerApi";
import type { CopyStatus, CopyTradeRow } from "@/lib/ledgerApi";
import type { CopyDecisionRow } from "@/lib/ledgerApi";
import { Card, DarkErrorBanner, InfoBanner } from "./components/DashboardUI";
import { PageHeading, SectionHeading } from "./components/DashboardUI";

export default function CopyTrading() {
  const [status, setStatus] = useState<CopyStatus | null>(null);
  const [trades, setTrades] = useState<CopyTradeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [multiplier, setMultiplier] = useState("1");

  async function refresh() {
    const [s, t] = await Promise.all([getCopyStatus(), getCopyTrades()]);
    setStatus(s);
    setTrades(t);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof ApiError ? err.message : "Load failed."));
  }, []);

  async function run(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(okMsg);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  const subscribed = status?.subscription != null;

  return (
    <>
      <Seo title="Copy trading" description="Link your account to the Nouveau master strategy." path="/dashboard/copy" />
      <PageHeading>Copy trading</PageHeading>
      <InfoBanner>
        Your account mirrors the <strong className="font-text">Nouveau master strategy</strong>. An AI proposes each
        master trade, a deterministic risk gate approves or blocks it, and approved trades are copied to your account.
      </InfoBanner>
      {error && <DarkErrorBanner>{error}</DarkErrorBanner>}
      {notice && <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 p-4 text-body text-cream">{notice}</div>}
      <RiseIn index={1} className="mt-6">
        <Card>
          <SectionHeading>Master link</SectionHeading>
          <p className="mt-2 text-body text-slate-light">
            Provider: <span className="text-cream">{status?.provider ?? "…"}</span>
            {" · "}Master: <span className="text-cream">{status?.master.login ?? "…"}</span>
            {" · "}Strategy: <span className="text-cream">{status?.master.strategyId ?? "not created yet"}</span>
          </p>
          {!subscribed ? (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-caption text-slate-light">
                Copy multiplier
                <input value={multiplier} onChange={(e) => setMultiplier(e.target.value)} className="ml-2 w-20 rounded border border-white/15 bg-navy px-2 py-1 text-cream" inputMode="decimal" />
              </label>
              <button
                disabled={busy}
                onClick={() => run(() => subscribeCopy({ mode: "multiplier", multiplier: Number(multiplier) || 1 }), "Linked — copying the master.")}
                className="rounded bg-gold px-4 py-2 text-body font-semibold text-navy disabled:opacity-50"
              >
                Link to master
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-body text-cream">Copying at {status!.subscription!.multiplier}x.</p>
              <button
                disabled={busy}
                onClick={() => run(() => unsubscribeCopy(), "Unlinked — no longer copying.")}
                className="rounded border border-white/20 px-4 py-2 text-body text-cream disabled:opacity-50"
              >
                Stop copying
              </button>
            </div>
          )}
        </Card>
      </RiseIn>
      <RiseIn index={2} className="mt-6">
        <Card>
          <SectionHeading>My copied trades ({trades.length})</SectionHeading>
          {trades.length === 0 ? (
            <p className="mt-2 text-body text-slate-light">Nothing copied yet — link to the master and run a demo trade.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {trades.slice(0, 20).map((t, i) => (
                <li key={i} className="rounded border border-white/10 p-3 text-body">
                  <span className="text-cream">{t.side.toUpperCase()} {t.symbol}</span>{" "}
                  <span className="text-slate-light">master {t.masterLot} → you {t.followerLot} · {t.status}</span>
                  <p className="mt-1 text-caption text-slate-light">{t.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </RiseIn>
      <RiseIn index={3} className="mt-6">
        <Card>
          <SectionHeading>Demo AI master trade + decision log</SectionHeading>
          <DemoTrade onDone={refresh} onError={setError} onNotice={setNotice} busy={busy} setBusy={setBusy} />
          <DecisionLog />
        </Card>
      </RiseIn>
    </>
  );
}

function DemoTrade(props: {
  onDone: () => Promise<void>;
  onError: (m: string) => void;
  onNotice: (m: string) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const [symbol, setSymbol] = useState("EURUSD");
  const [bias, setBias] = useState("buy");
  const [reason, setReason] = useState("trend continuation with indicator agreement");
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <label className="text-caption text-slate-light">
        Symbol
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="mt-1 w-full rounded border border-white/15 bg-navy px-2 py-1 text-cream" />
      </label>
      <label className="text-caption text-slate-light">
        Bias
        <select value={bias} onChange={(e) => setBias(e.target.value)} className="mt-1 w-full rounded border border-white/15 bg-navy px-2 py-1 text-cream">
          <option value="buy">buy</option>
          <option value="sell">sell</option>
          <option value="hold">hold (logs a no-trade)</option>
        </select>
      </label>
      <label className="text-caption text-slate-light">
        AI reason
        <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded border border-white/15 bg-navy px-2 py-1 text-cream" />
      </label>
      <div className="md:col-span-3">
        <button
          disabled={props.busy}
          onClick={async () => {
            props.setBusy(true);
            try {
              const r = await demoCopyTrade({ symbol, bias, confidence: 0.85, reason, requestedLot: 1, stopLossPips: 25, takeProfitPips: 50 });
              props.onNotice(`${r.verdict.toUpperCase()}: ${r.logReason} (${r.copies} copied, ${r.skipped} skipped)`);
              await props.onDone();
            } catch (err) {
              props.onError(err instanceof ApiError ? err.message : "Try again.");
            } finally {
              props.setBusy(false);
            }
          }}
          className="rounded bg-gold px-4 py-2 text-body font-semibold text-navy disabled:opacity-50"
        >
          Run AI trade
        </button>
      </div>
    </div>
  );
}

function DecisionLog() {
  const [decisions, setDecisions] = useState<CopyDecisionRow[]>([]);
  useEffect(() => {
    getCopyDecisions().then(setDecisions).catch(() => undefined);
  }, []);
  if (decisions.length === 0) return <p className="mt-4 text-body text-slate-light">No AI decisions yet.</p>;
  return (
    <ul className="mt-4 space-y-2">
      {decisions.slice(0, 20).map((d, i) => (
        <li key={i} className="rounded border border-white/10 p-3 text-body">
          <span className="text-cream">{d.bias.toUpperCase()} {d.symbol}</span> <span className="text-gold">{d.verdict}</span>
          <p className="mt-1 text-caption text-slate-light">{d.logReason}</p>
        </li>
      ))}
    </ul>
  );
}

