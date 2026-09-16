import { useState, useEffect, type FormEvent } from "react";
import { TextField, SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function LpoaStep() {
  const { refresh } = useAuth();
  const [document, setDocument] = useState<{ version: string; text: string } | null>(null);
  const [signedName, setSignedName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<{ version: string; text: string }>("/onboarding/lpoa-document").then(setDocument);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/onboarding/lpoa", { signedName });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <RiseIn>
        <p className="text-body text-slate">
          You authorize our trading desk to manage the at-risk half of your deposit, within limits you set now.
        </p>
      </RiseIn>
      <RiseIn index={1}>
        <div className="max-h-64 overflow-y-auto border border-navy-line/40 bg-paper-2 p-4 text-caption leading-relaxed text-ink">
          {document ? (
            <pre className="whitespace-pre-wrap font-text">{document.text}</pre>
          ) : (
            <p className="text-slate">Loading document…</p>
          )}
        </div>
      </RiseIn>
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {error && <ErrorBanner message={error} />}
        <RiseIn index={2}>
          <TextField
            label="Type your full legal name to sign"
            name="signedName"
            required
            minLength={3}
            value={signedName}
            onChange={(e) => setSignedName(e.target.value)}
          />
        </RiseIn>
        <RiseIn index={3}>
          <SubmitButton disabled={submitting || !document}>
            {submitting ? "Signing…" : "Sign and continue"}
          </SubmitButton>
        </RiseIn>
      </form>
    </div>
  );
}
