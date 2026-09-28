import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import { TextField, SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";
import { deposit } from "@/lib/ledgerApi";
import { ApiError } from "@/lib/api";

/**
 * A real, working deposit form — posts to @nouveau/api's
 * POST /account/deposit, which really splits the amount 50/50 into custody
 * and at-risk and persists it to the ledger (see apps/api's ledgerService).
 * What's still simulated is the payment capture itself: no real bank
 * transfer or card charge happens yet, since no payment processor is
 * connected (see the banner below and apps/api/README.md) — the banner
 * must stay until a real processor is wired in, so a real user is never
 * led to think a real transfer just happened.
 */
export default function Funding() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    inFlight.current = true;
    setError(null);
    setSubmitting(true);
    try {
      await deposit(Math.round(dollars * 100));
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo title="Fund your account" description="Deposit into your Nouveau account." path="/dashboard/funding" />
      <h1 className="font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
        Fund your account
      </h1>
      <RiseIn index={1} className="mt-6">
        <div className="border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
          <strong className="font-text">Simulated payment.</strong> This deposit is real in your account
          history — it splits into custody and at-risk exactly like a real one would — but no payment processor
          is connected yet, so no real money moves.
        </div>
      </RiseIn>
      <form onSubmit={onSubmit} className="mt-8 max-w-sm space-y-6" noValidate>
        {error && <ErrorBanner message={error} />}
        <RiseIn index={2}>
          <TextField
            label="Amount (USD)"
            name="amount"
            type="number"
            min="1"
            step="0.01"
            placeholder="10,000"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </RiseIn>
        <RiseIn index={3}>
          <SubmitButton disabled={submitting}>{submitting ? "Depositing…" : "Deposit funds"}</SubmitButton>
        </RiseIn>
      </form>
    </>
  );
}
