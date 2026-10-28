import { useEffect, useRef, useState, type FormEvent } from "react";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { Card, Badge, DarkTextField, DarkErrorBanner, PageHeading, SectionHeading } from "@/pages/dashboard/components/DashboardUI";
import { formatPrice } from "@/lib/botsApi";
import { getMasterStrategies, getBotPlans, createBotPlan, setBotPlanStatus, type AdminMasterStrategy, type AdminBotPlan } from "@/lib/adminApi";
import { ApiError } from "@/lib/api";

function PlanRow({ plan, strategyName, onChanged }: { plan: AdminBotPlan; strategyName: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await setBotPlanStatus(plan.id, plan.status === "active" ? "retired" : "active");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-small text-paper">{plan.name}</p>
        <p className="mt-1 text-caption text-slate-light">{strategyName}</p>
        <p className="mt-1 font-mono-figure text-caption text-paper">
          {formatPrice(plan.priceCents, plan.currency)}/{plan.interval} · {plan.defaultMultiplier}x
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge label={plan.status} tone={plan.status === "active" ? "gain" : "loss"} />
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="border border-navy-line/50 px-3 py-1.5 text-caption text-slate-light transition-colors duration-200 hover:border-gold/40 hover:text-paper disabled:opacity-50"
        >
          {plan.status === "active" ? "Retire" : "Reactivate"}
        </button>
      </div>
    </Card>
  );
}

export default function BotPlans() {
  const [strategies, setStrategies] = useState<AdminMasterStrategy[] | null>(null);
  const [plans, setPlans] = useState<AdminBotPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [masterStrategyId, setMasterStrategyId] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [defaultMultiplier, setDefaultMultiplier] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const inFlight = useRef(false);

  function load() {
    Promise.all([getMasterStrategies(), getBotPlans()])
      .then(([s, p]) => {
        setStrategies(s.masterStrategies);
        setPlans(p.botPlans);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load bot plans."));
  }

  useEffect(load, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || !masterStrategyId) return;
    inFlight.current = true;
    setFormError(null);
    setSubmitting(true);
    try {
      const created = await createBotPlan({
        name,
        masterStrategyId,
        priceCents,
        defaultMultiplier: defaultMultiplier ? Number(defaultMultiplier) : undefined,
      });
      setPlans((prev) => (prev ? [created, ...prev] : [created]));
      setName("");
      setPriceCents("");
      setDefaultMultiplier("1");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't create that plan. Try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const strategyName = (id: string) => strategies?.find((s) => s.id === id)?.name ?? "Unknown strategy";

  return (
    <>
      <Seo title="Admin — Bot Plans" description="Pricing plans tied to each master strategy." path="/admin/bot-plans" />
      <PageHeading>Bot Plans</PageHeading>
      <p className="mt-2 text-small text-slate-light">
        A plan is what a user actually pays for — it's tied to exactly one master strategy. There's no price-editing on purpose: retire a plan and
        create a new one instead of repricing one subscribers already bought.
      </p>

      {error && (
        <div className="mt-6">
          <DarkErrorBanner message={error} />
        </div>
      )}

      <RiseIn index={0} className="mt-8">
        <Card>
          <SectionHeading>Add a plan</SectionHeading>
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            {formError && <DarkErrorBanner message={formError} />}
            <div>
              <label htmlFor="masterStrategyId" className="text-caption uppercase tracking-[0.08em] text-slate-light">
                Master strategy
              </label>
              <select
                id="masterStrategyId"
                required
                value={masterStrategyId}
                onChange={(e) => setMasterStrategyId(e.target.value)}
                className="mt-2 w-full border-0 border-b border-navy-line bg-transparent py-3 text-body text-paper focus:border-gold focus:outline-none"
              >
                <option value="" className="bg-navy-deep">
                  Choose a strategy…
                </option>
                {strategies
                  ?.filter((s) => s.status === "active")
                  .map((s) => (
                    <option key={s.id} value={s.id} className="bg-navy-deep">
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <DarkTextField label="Name" name="name" required value={name} onChange={(e) => setName(e.target.value)} className="sm:col-span-2" />
              <DarkTextField
                label="Default multiplier"
                name="defaultMultiplier"
                type="number"
                min="0.1"
                step="0.1"
                value={defaultMultiplier}
                onChange={(e) => setDefaultMultiplier(e.target.value)}
              />
            </div>
            <DarkTextField
              label="Price (minor units, e.g. kobo for NGN)"
              name="priceCents"
              required
              inputMode="numeric"
              pattern="\d+"
              value={priceCents}
              onChange={(e) => setPriceCents(e.target.value)}
            />
            <button
              type="submit"
              disabled={submitting || !masterStrategyId}
              className="bg-gold px-6 py-3 text-small text-navy-deep transition-colors duration-300 hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create plan"}
            </button>
          </form>
        </Card>
      </RiseIn>

      <div className="mt-8 space-y-3">
        {!plans && !error && <p className="text-body text-slate-light">Loading…</p>}
        {plans?.length === 0 && <p className="text-body text-slate-light">No bot plans yet.</p>}
        {plans?.map((p, i) => (
          <RiseIn key={p.id} index={i + 1}>
            <PlanRow plan={p} strategyName={strategyName(p.masterStrategyId)} onChanged={load} />
          </RiseIn>
        ))}
      </div>
    </>
  );
}
