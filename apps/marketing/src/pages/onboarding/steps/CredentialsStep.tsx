import { useRef, useState, type FormEvent } from "react";
import { TextField, SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function CredentialsStep() {
  const { refresh } = useAuth();
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
          Your trading account login is encrypted — no one at Nouveau can read it back, including our own staff.
        </p>
      </RiseIn>
      {error && <ErrorBanner message={error} />}
      <RiseIn index={1}>
        <TextField
          label="Trading account password"
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
