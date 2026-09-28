import { useRef, useState, type FormEvent } from "react";
import { TextField, SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

/**
 * Trader track only — the user links their OWN existing broker account.
 * Deliberately mirrors BrokerAccountStep's shape (identifiers only, no
 * password here) since the read-only investor password is captured, and
 * verified against the broker, on the next step (CredentialsStep).
 */
export default function BrokerLinkStep() {
  const { refresh } = useAuth();
  const [form, setForm] = useState({ broker: "", login: "", serverName: "" });
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
      await api.post("/onboarding/broker-link", form);
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
        <p className="text-body text-slate">
          Link your existing trading account — Nouveau never takes custody of your funds or places trades on
          your behalf here.
        </p>
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
        <SubmitButton disabled={submitting}>{submitting ? "Linking…" : "Link account"}</SubmitButton>
      </RiseIn>
    </form>
  );
}
