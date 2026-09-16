import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { TextField, SubmitButton } from "@/components/ui/FormField";
import { api } from "@/lib/api";

export default function ResetPasswordRequest() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/password-reset/request", { email });
    } finally {
      setSubmitting(false);
      setSubmitted(true); // shown regardless of outcome — never reveal whether the email is registered
    }
  }

  return (
    <>
      <Seo title="Reset your password" description="Request a password reset link for your Nouveau account." path="/reset-password" />
      <div className="mx-auto flex min-h-[100svh] max-w-sm flex-col justify-center px-6 py-32">
        <h1 className="font-display text-ink" style={{ fontSize: "clamp(32px, 4vw, 44px)" }}>
          Reset your password.
        </h1>
        {submitted ? (
          <p className="mt-6 text-body text-slate">If that email is registered, a reset link has been sent.</p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6">
            <TextField
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <SubmitButton disabled={submitting}>{submitting ? "Sending…" : "Send reset link"}</SubmitButton>
          </form>
        )}
        <p className="mt-8 text-caption">
          <Link to="/login" className="text-gold-deep">
            Back to log in
          </Link>
        </p>
      </div>
    </>
  );
}
