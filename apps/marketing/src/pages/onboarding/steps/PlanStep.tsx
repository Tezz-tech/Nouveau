import { useRef, useState, type FormEvent } from "react";
import { SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

/** Trader track only — the flat subscription that pays for the AI trading
 *  assistance. There is no investor equivalent: an investor pays via the
 *  profit split at settlement, not a subscription picked during onboarding. */
export default function PlanStep() {
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/onboarding/plan", { plan: "trader_monthly" });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <RiseIn>
        <p className="text-body text-slate">Choose the subscription that covers your live trading analysis.</p>
      </RiseIn>
      {error && <ErrorBanner message={error} />}
      <RiseIn index={1}>
        <div className="space-y-1 border border-ink bg-paper-2 px-4 py-3">
          <p className="text-small font-semibold text-ink">Trader monthly</p>
          <p className="text-caption text-slate">
            Live buy/sell analysis on the broker account you linked, plus chart tools. Billed monthly, cancel
            anytime.
          </p>
          <p className="text-h3 font-display text-ink">$49/mo</p>
        </div>
      </RiseIn>
      <RiseIn index={2}>
        <SubmitButton disabled={submitting}>{submitting ? "Subscribing…" : "Subscribe and continue"}</SubmitButton>
      </RiseIn>
    </form>
  );
}
