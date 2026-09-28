import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import { TextField, SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";
import { withdraw } from "@/lib/ledgerApi";
import { ApiError } from "@/lib/api";

/**
 * A real, working withdrawal form — posts to @nouveau/api's
 * POST /account/withdraw, which really moves funds out of custody in the
 * ledger and rejects an amount over your real available balance. What's
 * still simulated is the payout itself: no real bank transfer happens yet,
 * since no payment processor is connected (see the banner below and
 * apps/api/README.md).
 */
export default function Withdraw() {
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
      await withdraw(Math.round(dollars * 100));
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
      <Seo title="Withdraw funds" description="Request a withdrawal from your Nouveau account." path="/dashboard/withdraw" />
      <h1 className="font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
        Withdraw funds
      </h1>
      <RiseIn index={1} className="mt-6">
        <div className="border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
          <strong className="font-text">Simulated payout.</strong> This withdrawal really moves funds out of
          your custody balance in the ledger, and is checked against it — but no payment processor is connected
          yet, so no real money moves to a bank account.
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
            placeholder="1,000"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </RiseIn>
        <RiseIn index={3}>
          <SubmitButton disabled={submitting}>{submitting ? "Withdrawing…" : "Request withdrawal"}</SubmitButton>
        </RiseIn>
      </form>
    </>
  );
}
