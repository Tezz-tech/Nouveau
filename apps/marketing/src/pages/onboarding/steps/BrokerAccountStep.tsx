import { useState, type FormEvent } from "react";
import { TextField, SubmitButton, ErrorBanner } from "@/components/ui/FormField";
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/onboarding/broker-account", form);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <p className="text-body text-slate">We open a trading sub-account in your name at our partner broker.</p>
      {error && <ErrorBanner message={error} />}
      <TextField
        label="Broker"
        name="broker"
        required
        value={form.broker}
        onChange={(e) => setForm({ ...form, broker: e.target.value })}
      />
      <TextField
        label="Account login"
        name="login"
        required
        value={form.login}
        onChange={(e) => setForm({ ...form, login: e.target.value })}
      />
      <TextField
        label="Server"
        name="serverName"
        required
        value={form.serverName}
        onChange={(e) => setForm({ ...form, serverName: e.target.value })}
      />
      <SubmitButton disabled={submitting}>{submitting ? "Creating account…" : "Create trading account"}</SubmitButton>
    </form>
  );
}
