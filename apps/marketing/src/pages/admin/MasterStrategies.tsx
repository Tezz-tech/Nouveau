import { useEffect, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { Card, Badge, DarkTextField, DarkErrorBanner, PageHeading, SectionHeading } from "@/pages/dashboard/components/DashboardUI";
import {
  getMasterStrategies,
  createMasterStrategy,
  getMasterStrategyStatus,
  setMasterStrategyStatus,
  type AdminMasterStrategy,
} from "@/lib/adminApi";
import { ApiError } from "@/lib/api";

const STATUS_TONE: Record<AdminMasterStrategy["status"], "gold" | "gain" | "loss" | "info"> = {
  provisioning: "info",
  active: "gain",
  paused: "gold",
  failed: "loss",
};

const POLL_INTERVAL_MS = 2500;

function StrategyRow({ strategy, onChanged }: { strategy: AdminMasterStrategy; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await setMasterStrategyStatus(strategy.id, strategy.status === "active" ? "paused" : "active");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-small text-paper">{strategy.name}</p>
        <p className="mt-1 text-caption text-slate-light">{strategy.description}</p>
        <p className="mt-1 font-mono-figure text-caption text-slate-light">
          {strategy.metaApiAccountId}
          {strategy.copyFactoryStrategyId && ` · ${strategy.copyFactoryStrategyId}`}
        </p>
        {strategy.lastError && <p className="mt-1 text-caption text-loss">{strategy.lastError}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Badge label={strategy.status} tone={STATUS_TONE[strategy.status]} />
        {(strategy.status === "active" || strategy.status === "paused") && (
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className="border border-navy-line/50 px-3 py-1.5 text-caption text-slate-light transition-colors duration-200 hover:border-gold/40 hover:text-paper disabled:opacity-50"
          >
            {strategy.status === "active" ? "Pause" : "Resume"}
          </button>
        )}
      </div>
    </Card>
  );
}

export default function MasterStrategies() {
  const [strategies, setStrategies] = useState<AdminMasterStrategy[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxTradeRiskPct, setMaxTradeRiskPct] = useState("");
  const [mode, setMode] = useState<"existing" | "fresh">("existing");
  const [existingMetaApiAccountId, setExistingMetaApiAccountId] = useState("");
  const [broker, setBroker] = useState("");
  const [login, setLogin] = useState("");
  const [serverName, setServerName] = useState("");
  const [tradingPassword, setTradingPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const pollingIds = useRef(new Set<string>());

  function load() {
    getMasterStrategies()
      .then((res) => {
        setStrategies(res.masterStrategies);
        for (const s of res.masterStrategies) {
          if (s.status === "provisioning") startPolling(s.id);
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load master strategies."));
  }

  function startPolling(id: string) {
    if (pollingIds.current.has(id)) return;
    pollingIds.current.add(id);
    const poll = async () => {
      const updated = await getMasterStrategyStatus(id).catch(() => null);
      if (!updated) {
        pollingIds.current.delete(id);
        return;
      }
      setStrategies((prev) => (prev ? prev.map((s) => (s.id === id ? updated : s)) : prev));
      if (updated.status === "provisioning") {
        setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        pollingIds.current.delete(id);
      }
    };
    poll();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setFormError(null);
    setSubmitting(true);
    try {
      const created = await createMasterStrategy({
        name,
        description,
        maxTradeRiskPct: maxTradeRiskPct ? Number(maxTradeRiskPct) : undefined,
        ...(mode === "existing" ? { existingMetaApiAccountId } : { broker, login, serverName, tradingPassword }),
      });
      setStrategies((prev) => (prev ? [created, ...prev] : [created]));
      if (created.status === "provisioning") startPolling(created.id);
      setName("");
      setDescription("");
      setMaxTradeRiskPct("");
      setExistingMetaApiAccountId("");
      setBroker("");
      setLogin("");
      setServerName("");
      setTradingPassword("");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't create that master strategy. Try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo title="Admin — Master Strategies" description="Link bots to master accounts." path="/admin" />
      <PageHeading>Master Strategies</PageHeading>
      <p className="mt-2 text-small text-slate-light">
        Each row is a "bot" — a real trader's MT5 account, mirrored by every subscriber linked to it. Add a new one either by pointing at an
        account you already set up in the MetaApi dashboard, or by giving its broker login directly here (used once, never stored).
      </p>

      {error && (
        <div className="mt-6">
          <DarkErrorBanner message={error} />
        </div>
      )}

      <RiseIn index={0} className="mt-8">
        <Card>
          <SectionHeading>Add a master strategy</SectionHeading>
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            {formError && <DarkErrorBanner message={formError} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <DarkTextField label="Name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
              <DarkTextField
                label="Max trade risk % (optional)"
                name="maxTradeRiskPct"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={maxTradeRiskPct}
                onChange={(e) => setMaxTradeRiskPct(e.target.value)}
              />
            </div>
            <DarkTextField label="Description" name="description" required value={description} onChange={(e) => setDescription(e.target.value)} />

            <div role="radiogroup" aria-label="Provisioning mode" className="flex gap-2">
              {(["existing", "fresh"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={clsx(
                    "border px-3 py-2 text-caption transition-colors duration-200",
                    mode === m ? "border-gold/50 bg-gold/10 text-gold" : "border-navy-line/50 text-slate-light hover:text-paper"
                  )}
                >
                  {m === "existing" ? "Already in MetaApi" : "Provision fresh"}
                </button>
              ))}
            </div>

            {mode === "existing" ? (
              <DarkTextField
                label="MetaApi account id"
                name="existingMetaApiAccountId"
                required
                value={existingMetaApiAccountId}
                onChange={(e) => setExistingMetaApiAccountId(e.target.value)}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <DarkTextField label="Broker" name="broker" required value={broker} onChange={(e) => setBroker(e.target.value)} />
                <DarkTextField label="Login" name="login" required value={login} onChange={(e) => setLogin(e.target.value)} />
                <DarkTextField label="Server" name="serverName" required value={serverName} onChange={(e) => setServerName(e.target.value)} />
                <DarkTextField
                  label="Trading password"
                  name="tradingPassword"
                  type="password"
                  required
                  autoComplete="off"
                  value={tradingPassword}
                  onChange={(e) => setTradingPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="bg-gold px-6 py-3 text-small text-navy-deep transition-colors duration-300 hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create master strategy"}
            </button>
          </form>
        </Card>
      </RiseIn>

      <div className="mt-8 space-y-3">
        {!strategies && !error && <p className="text-body text-slate-light">Loading…</p>}
        {strategies?.length === 0 && <p className="text-body text-slate-light">No master strategies yet.</p>}
        {strategies?.map((s, i) => (
          <RiseIn key={s.id} index={i + 1}>
            <StrategyRow strategy={s} onChanged={load} />
          </RiseIn>
        ))}
      </div>
    </>
  );
}
