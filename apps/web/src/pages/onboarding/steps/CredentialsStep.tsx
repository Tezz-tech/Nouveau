import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { TextField, Button, ErrorBanner } from "@/components/FormField";

export default function CredentialsStep() {
  const { refresh } = useAuth();
  const [mt5Password, setMt5Password] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/onboarding/credentials", { mt5Password });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
      setMt5Password(""); // never leave it sitting in state longer than necessary
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-slate">
        Your trading account login is encrypted — no one at Nouveau can read it back, including our own staff.
      </p>
      {error && <ErrorBanner message={error} />}
      <TextField
        label="Trading account password"
        name="mt5Password"
        type="password"
        required
        autoComplete="off"
        value={mt5Password}
        onChange={(e) => setMt5Password(e.target.value)}
      />
      <Button type="submit" disabled={submitting}>
        {submitting ? "Securing…" : "Secure my credentials"}
      </Button>
    </form>
  );
}
