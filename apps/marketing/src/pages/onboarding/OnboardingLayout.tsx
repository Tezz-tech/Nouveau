import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const STEP_TO_PATH: Record<string, string> = {
  identity: "/onboarding/identity",
  broker_account: "/onboarding/broker-account",
  credentials: "/onboarding/credentials",
  lpoa: "/onboarding/lpoa",
  complete: "/onboarding/complete",
};

/**
 * Resumability: on every load, if the URL doesn't match where the backend
 * says this user actually is, redirect to the real next step — refreshing
 * mid-wizard, closing the tab and coming back tomorrow, or someone pasting
 * an old bookmarked step URL all land in the same, correct place. The
 * backend enforces the same ordering independently (see
 * `canCompleteStep`/`409` in @nouveau/api) — this redirect is a UX
 * convenience, not the actual security boundary.
 */
export default function OnboardingLayout() {
  const { loading, authenticated, onboarding } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (!onboarding) return;
    const correctPath = STEP_TO_PATH[onboarding.nextStep];
    if (correctPath && location.pathname !== correctPath) {
      navigate(correctPath, { replace: true });
    }
  }, [loading, authenticated, onboarding, location.pathname, navigate]);

  if (loading || !onboarding) {
    return <div className="p-6 text-body text-slate">Loading…</div>;
  }

  return (
    <div className="mx-auto min-h-[100svh] max-w-lg px-6 py-20">
      <h1 className="font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 38px)" }}>
        Set up your account
      </h1>

      <ol className="mt-8 space-y-0">
        {onboarding.steps
          .filter((s) => s.step !== "account") // signup itself, already done by the time this page renders
          .map((s, i, arr) => {
            const isCurrent = s.step === onboarding.nextStep;
            return (
              <li key={s.step} className="relative flex gap-3 pb-6 last:pb-0">
                {i < arr.length - 1 && (
                  <span className="absolute left-[11px] top-6 h-full w-px bg-navy-line/30" aria-hidden="true" />
                )}
                <span
                  className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption ${
                    s.completed
                      ? "bg-ink text-paper"
                      : isCurrent
                        ? "border-2 border-gold-deep text-gold-deep"
                        : "border border-navy-line/40 text-slate"
                  }`}
                >
                  {s.completed ? "✓" : i}
                </span>
                <div>
                  <p className={`text-small ${isCurrent ? "text-ink" : "text-slate"}`}>{s.description}</p>
                </div>
              </li>
            );
          })}
      </ol>

      <div className="mt-6 h-1 w-full bg-paper-2">
        <div
          className="h-1 bg-gold-deep transition-all duration-300 ease-house"
          style={{ width: `${onboarding.progressFraction * 100}%` }}
          role="progressbar"
          aria-valuenow={Math.round(onboarding.progressFraction * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="mt-10">
        <Outlet />
      </div>
    </div>
  );
}
