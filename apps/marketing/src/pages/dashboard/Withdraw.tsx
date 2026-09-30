import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/Button";
import RiseIn from "@/components/motion/RiseIn";
import { DarkErrorBanner, DarkTextField, InfoBanner, PageHeading, SuccessFlash } from "./components/DashboardUI";
import { withdraw } from "@/lib/ledgerApi";
import { ApiError } from "@/lib/api";

/**
 * A real, working withdrawal form — posts to @nouveau/api's
 * POST /account/withdraw, which really moves funds out of custody in the
 * ledger and rejects an amount over your real available balance. What's
 * still simulated is the payout itself: no real bank transfer happens yet,
 * since no payment processor is connected (see the banner below and
 * apps/api/README.md).
 *
 * A successful withdrawal shows a brief confirmation here before returning
 * to Overview, instead of navigating away instantly.
 */
export default function Withdraw() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
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
      setSucceeded(true);
      setTimeout(() => navigate("/dashboard"), 1100);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (succeeded) {
    return <SuccessFlash message={`Withdrawal of $${Number(amount).toLocaleString()} requested`} />;
  }

  return (
    <>
      <Seo title="Withdraw funds" description="Request a withdrawal from your Nouveau account." path="/dashboard/withdraw" />
      <PageHeading>Withdraw funds</PageHeading>
      <RiseIn index={1} className="mt-6">
        <InfoBanner>
          <strong className="font-text">Simulated payout.</strong> This withdrawal really moves funds out of
          your custody balance in the ledger, and is checked against it — but no payment processor is connected
          yet, so no real money moves to a bank account.
        </InfoBanner>
      </RiseIn>
      <form onSubmit={onSubmit} className="mt-8 max-w-sm space-y-6" noValidate>
        {error && <DarkErrorBanner message={error} />}
        <RiseIn index={2}>
          <DarkTextField
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
          <Button tone="dark" type="submit" disabled={submitting} className="w-full justify-center active:scale-[0.98] transition-transform">
            {submitting ? "Withdrawing…" : "Request withdrawal"}
          </Button>
        </RiseIn>
      </form>
    </>
  );
}
