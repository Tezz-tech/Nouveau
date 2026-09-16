import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Glow from "@/components/ui/Glow";
import ProgressBar from "@/components/ui/ProgressBar";
import RiseIn from "@/components/motion/RiseIn";
import RouteFade from "@/components/motion/RouteFade";
import { houseTransition } from "@/lib/motion";
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

  // Deliberately NOT `loading || !onboarding` — `loading` also flips true
  // on every background refresh() call after a step submission (not just
  // the very first load), and `onboarding` never resets to null for those.
  // Gating on `loading` too was unmounting this whole subtree (including
  // whatever step is currently mounted) on every single step transition,
  // and remounting it fresh milliseconds later — before the redirect
  // effect above had navigated away — which reset that step's local form
  // state to empty right as it (or a test driving it) could still act on
  // it. A real bug, not hypothetical: it showed up as onboarding steps
  // occasionally submitting empty data on their second, spurious mount.
  if (!onboarding) {
    return <div className="p-6 text-body text-slate">Loading…</div>;
  }

  return (
    <div className="relative mx-auto min-h-[100svh] max-w-lg overflow-hidden px-6 py-20">
      <Glow tone="gold" size={420} className="pointer-events-none -right-48 -top-32" />

      <RiseIn>
        <h1 className="font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 38px)" }}>
          Set up your account
        </h1>
      </RiseIn>

      <RiseIn index={1}>
        <ol className="relative mt-8 space-y-0">
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
                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-caption transition-colors duration-300 ${
                      s.completed
                        ? "bg-ink text-paper"
                        : isCurrent
                          ? "border-2 border-gold-deep text-gold-deep"
                          : "border border-navy-line/40 text-slate"
                    }`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={s.completed ? "done" : "todo"}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={houseTransition}
                      >
                        {s.completed ? "✓" : i}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <div>
                    <p className={`text-small ${isCurrent ? "text-ink" : "text-slate"}`}>{s.description}</p>
                  </div>
                </li>
              );
            })}
        </ol>
      </RiseIn>

      <RiseIn index={2} className="mt-6">
        <ProgressBar fraction={onboarding.progressFraction} />
      </RiseIn>

      <div className="mt-10">
        <RouteFade />
      </div>
    </div>
  );
}
