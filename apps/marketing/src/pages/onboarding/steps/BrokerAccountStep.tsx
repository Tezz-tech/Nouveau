import { useRef, useState, type FormEvent } from "react";
import { TextField, SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

/**
 * ASSUMPTION FLAGGED (mirrors the note in @nouveau/api's README): with no
 * broker partner chosen yet, this collects broker/login/serverName directly
 * rather than through a real "partner link" redirect. Likely the first
 * thing to change once a broker is selected.
 */
export default function BrokerAccountStep() {
  const { refresh } = useAuth();
  const [form, setForm] = useState({ broker: "", login: "", serverName: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Synchronous guard against a double submit dispatch — `disabled={submitting}`
  // alone isn't enough, since it only takes effect once React re-renders
  // with the updated state, and two submit events close enough together
  // can both see `submitting` as still false. Confirmed as a real bug via
  // Playwright: this step's onSubmit fired twice from a single click,
  // succeeding once then failing with a harmless 409 on the duplicate.
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/onboarding/broker-account", form);
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
        <p className="text-body text-slate">We open a trading sub-account in your name at our partner broker.</p>
      </RiseIn>
      {error && <ErrorBanner message={error} />}
      <RiseIn index={1}>
        <TextField
          label="Broker"
          name="broker"
          required
          value={form.broker}
          onChange={(e) => setForm((prev) => ({ ...prev, broker: e.target.value }))}
        />
      </RiseIn>
      <RiseIn index={2}>
        <TextField
          label="Account login"
          name="login"
          required
          value={form.login}
          onChange={(e) => setForm((prev) => ({ ...prev, login: e.target.value }))}
        />
      </RiseIn>
      <RiseIn index={3}>
        <TextField
          label="Server"
          name="serverName"
          required
          value={form.serverName}
          onChange={(e) => setForm((prev) => ({ ...prev, serverName: e.target.value }))}
        />
      </RiseIn>
      <RiseIn index={4}>
        <SubmitButton disabled={submitting}>{submitting ? "Creating account…" : "Create trading account"}</SubmitButton>
      </RiseIn>
    </form>
  );
}
