import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import Seo from "@/components/Seo";
import Glow from "@/components/ui/Glow";
import { TextField, SelectField } from "@/components/ui/FormField";
import { signupContent, interestOptions } from "@/content/auth";

export default function Signup() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <Seo
        title="Open an account"
        description="Open a Nouveau account and choose the product that fits how you want exposure — Fund Management, Trading Bots, or Trader Intelligence."
        path="/signup"
      />

      <div className="grid min-h-[100svh] md:grid-cols-2">
        <div className="order-2 flex items-center justify-center px-6 py-32 md:order-1 md:px-16">
          <div className="w-full max-w-sm">
            <h1
              className="font-display text-ink"
              style={{ fontSize: "clamp(38px, 5vw, 56px)", lineHeight: 1 }}
            >
              {signupContent.heading}
            </h1>
            <p className="mt-3 text-body text-slate">{signupContent.sub}</p>

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="mt-10 space-y-6"
            >
              <TextField label="Full name" name="name" required autoComplete="name" />
              <TextField
                label="Email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
              <TextField
                label="Password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                errorMessage="Password must be at least 8 characters."
              />
              <SelectField label="Primary interest" name="interest" options={interestOptions} />

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  required
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="peer sr-only"
                  aria-describedby="risk-ack-text"
                />
                <span
                  aria-hidden="true"
                  className={clsx(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-navy-line/50 transition-colors duration-200",
                    "peer-checked:border-ink peer-checked:bg-ink",
                    "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-deep"
                  )}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3 w-3 fill-none stroke-paper stroke-[2] opacity-0 peer-checked:opacity-100"
                    style={{ opacity: acknowledged ? 1 : 0 }}
                  >
                    <path d="M3 8.5L6.5 12L13 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span id="risk-ack-text" className="text-small text-slate">
                  {signupContent.riskAcknowledgement}
                </span>
              </label>

              <button
                type="submit"
                disabled={!acknowledged}
                className="w-full bg-ink px-6 py-3.5 text-small text-paper transition-colors duration-300 hover:bg-navy disabled:cursor-not-allowed disabled:bg-navy-line/30 disabled:text-slate/70 disabled:hover:bg-navy-line/30"
              >
                Create account
              </button>
              <p className="text-caption text-slate">
                {acknowledged
                  ? " "
                  : "Acknowledge the risk above to continue."}
              </p>

              <p role="status" aria-live="polite" className="min-h-[1.2em] text-caption text-gold-deep">
                {submitted
                  ? "This is a design preview — no account was actually created."
                  : ""}
              </p>
            </form>

            <p className="mt-8 text-caption text-slate">
              Already have an account?{" "}
              <Link to="/login" className="text-gold-deep">
                Log in
              </Link>
            </p>
          </div>
        </div>

        <div className="on-dark relative order-1 h-64 overflow-hidden bg-navy-deep md:order-2 md:h-auto">
          <Glow tone="gold" size={520} className="-right-32 -top-32" />
          <Glow tone="navy" size={600} className="-bottom-40 -left-40" />
          <ul className="absolute inset-x-0 bottom-0 hidden flex-col gap-3 p-10 md:flex">
            {signupContent.panel.statements.map((s) => (
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
