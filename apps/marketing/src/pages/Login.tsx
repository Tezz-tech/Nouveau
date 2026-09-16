import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import Glow from "@/components/ui/Glow";
import { LogoFull } from "@/components/ui/Logo";
import { TextField, SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import { loginContent } from "@/content/auth";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useDelayedFlag } from "@/lib/useDelayedFlag";

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isSlow = useDelayedFlag(submitting, 2500);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/login", { email, password });
      await refresh();
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo
        title="Log in"
        description="Log in to your Nouveau account."
        path="/login"
      />

      <div className="grid min-h-[100svh] md:grid-cols-2">
        <div className="order-2 flex items-center justify-center px-6 py-32 md:order-1 md:px-16">
          <div className="w-full max-w-sm">
            <h1 className="font-display text-ink" style={{ fontSize: "clamp(38px, 5vw, 56px)" }}>
              {loginContent.heading}
            </h1>
            <p className="mt-3 text-body text-slate">{loginContent.sub}</p>

            <form onSubmit={onSubmit} noValidate className="mt-10 space-y-6">
              {error && <ErrorBanner message={error} />}
              <TextField
                label="Email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label="Password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                errorMessage="Enter your password."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <SubmitButton disabled={submitting}>{submitting ? "Logging in…" : "Log in"}</SubmitButton>
              {isSlow && (
                <p role="status" aria-live="polite" className="text-caption text-slate">
                  Still working — a first request can take a few extra seconds. Hang tight.
                </p>
              )}
            </form>

            <div className="mt-8 flex items-center justify-between text-caption">
              <Link to="/reset-password" className="text-slate underline decoration-navy-line underline-offset-4">
                Forgot password
              </Link>
              <Link to="/signup" className="text-gold-deep">
                Open an account instead
              </Link>
            </div>
          </div>
        </div>

        <div className="on-dark relative order-1 h-64 overflow-hidden bg-navy-deep md:order-2 md:h-auto">
          <Glow tone="gold" size={520} className="-right-32 -top-32" />
          <Glow tone="navy" size={600} className="-bottom-40 -left-40" />
          <LogoFull className="absolute left-10 top-28 hidden h-10 md:block" />
          <ul className="absolute inset-x-0 bottom-0 hidden flex-col gap-3 p-10 md:flex">
            {loginContent.panel.statements.map((s) => (
              <li key={s} className="text-h3 font-display text-paper">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
