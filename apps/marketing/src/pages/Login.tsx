import { useState } from "react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import Glow from "@/components/ui/Glow";
import { LogoFull } from "@/components/ui/Logo";
import { TextField } from "@/components/ui/FormField";
import { loginContent } from "@/content/auth";

export default function Login() {
  const [submitted, setSubmitted] = useState(false);

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

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="mt-10 space-y-6"
            >
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
                autoComplete="current-password"
                errorMessage="Enter your password."
              />

              <button
                type="submit"
                className="w-full bg-ink px-6 py-3.5 text-small text-paper transition-colors duration-300 hover:bg-navy"
              >
                Log in
              </button>

              <p role="status" aria-live="polite" className="min-h-[1.2em] text-caption text-gold-deep">
                {submitted
                  ? "This is a design preview — no account exists to log into."
                  : ""}
              </p>
            </form>

            <div className="mt-8 flex items-center justify-between text-caption">
              <button type="button" className="text-slate underline decoration-navy-line underline-offset-4">
                Forgot password
              </button>
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
