import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Seo from "@/components/Seo";
import { TextField, SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import { api, ApiError } from "@/lib/api";

export default function ResetPasswordConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // See BrokerAccountStep (onboarding) for why this ref (not just
  // `disabled={submitting}`) is needed to stop a double submit dispatch.
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/password-reset/confirm", { token, newPassword });
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo title="Choose a new password" description="Set a new password for your Nouveau account." path="/reset-password/confirm" />
      <div className="mx-auto flex min-h-[100svh] max-w-sm flex-col justify-center px-6 py-32">
        {!token ? (
          <>
            <ErrorBanner message="This reset link is missing its token. Request a new one." />
            <Link to="/reset-password" className="mt-6 text-caption text-gold-deep">
              Request a new reset link
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-ink" style={{ fontSize: "clamp(32px, 4vw, 44px)" }}>
              Choose a new password.
            </h1>
            <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6">
              {error && <ErrorBanner message={error} />}
              <TextField
                label="New password"
                name="newPassword"
                type="password"
                required
                minLength={10}
                errorMessage="Password must be at least 10 characters."
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <SubmitButton disabled={submitting}>{submitting ? "Updating…" : "Update password"}</SubmitButton>
            </form>
          </>
        )}
      </div>
    </>
  );
}
