import { useRef, useState, type FormEvent } from "react";
import { TextField, SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

/**
 * Shared by both tracks. An investor's password is their full MT5 trading
 * password (Nouveau needs it to copy-trade). A trader's is MT4/5's own
 * read-only "investor password" — this is verified against their broker
 * before the step is allowed to complete, so the copy below says so
 * explicitly rather than reusing the investor's wording.
 */
export default function CredentialsStep() {
  const { refresh, onboarding } = useAuth();
  const isTrader = onboarding?.accountType === "trader";
  const [mt5Password, setMt5Password] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // See BrokerAccountStep for why this ref (not just `disabled={submitting}`)
  // is needed to stop a double submit dispatch.
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/onboarding/credentials", { mt5Password });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
      setMt5Password(""); // never leave it sitting in state longer than necessary
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <RiseIn>
        <p className="text-body text-slate">
          {isTrader
            ? "Use your account's investor (read-only) password, not your trading password — this lets us see your activity for analysis, but it can never place a trade or move funds. We verify it against your broker before continuing."
            : "Your trading account login is encrypted — no one at Nouveau can read it back, including our own staff."}
        </p>
      </RiseIn>
      {error && <ErrorBanner message={error} />}
      <RiseIn index={1}>
        <TextField
          label={isTrader ? "Investor (read-only) password" : "Trading account password"}
          name="mt5Password"
          type="password"
          required
          autoComplete="off"
          value={mt5Password}
          onChange={(e) => setMt5Password(e.target.value)}
        />
      </RiseIn>
      <RiseIn index={2}>
        <SubmitButton disabled={submitting}>{submitting ? "Securing…" : "Secure my credentials"}</SubmitButton>
      </RiseIn>
    </form>
  );
}
