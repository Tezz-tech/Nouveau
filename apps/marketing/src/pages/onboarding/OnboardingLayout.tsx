import { useEffect, useState } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import Glow from "@/components/ui/Glow";
import ProgressBar from "@/components/ui/ProgressBar";
import RiseIn from "@/components/motion/RiseIn";
import { useAuth } from "@/lib/AuthContext";
import { getProfile, type FlowStatus, type FlowStage } from "@/lib/profileApi";

const STAGE_TO_PATH: Record<FlowStage, string> = {
  choose_bot: "/onboarding/choose-bot",
  awaiting_link: "/onboarding/link-account",
  linking: "/onboarding/link-account",
  link_failed: "/onboarding/link-account",
  complete: "/onboarding/complete",
};

const STAGE_ORDER: FlowStage[] = ["choose_bot", "awaiting_link", "complete"];
const STAGE_LABELS: Record<string, string> = { choose_bot: "Choose a bot", awaiting_link: "Link your account", complete: "Done" };

/** Groups awaiting_link/linking/link_failed as one visible step — they're
 *  all "link your account," just at different points of the same attempt. */
function visibleStage(stage: FlowStage): string {
  if (stage === "linking" || stage === "link_failed") return "awaiting_link";
  return stage;
}

/**
 * Resumability: on every load, if the URL doesn't match where the backend
 * says this user actually is, redirect to the real stage — refreshing
 * mid-wizard, closing the tab and coming back later, or pasting an old
 * bookmarked step URL all land in the same, correct place. The backend
 * enforces the same ordering independently (service-layer checks in
 * mtAccountService/botSubscriptionService) — this redirect is a UX
 * convenience, not the actual boundary.
 */
export default function OnboardingLayout() {
  const { loading, authenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [flow, setFlow] = useState<FlowStatus | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      navigate("/login", { replace: true });
      return;
    }
    let cancelled = false;
    getProfile().then((profile) => {
      if (cancelled) return;
      setFlow(profile.flow);
      // The pay-callback page is a deliberate exception — it manages its
      // own polling/redirect while a webhook may still be in flight.
      if (location.pathname === "/onboarding/pay/callback") return;
      const correctPath = STAGE_TO_PATH[profile.flow.stage];
      if (correctPath && location.pathname !== correctPath) {
        navigate(correctPath, { replace: true });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, authenticated, location.pathname]);

  if (!flow) {
    return <div className="p-6 text-body text-slate">Loading…</div>;
  }

  const currentVisible = visibleStage(flow.stage);
  const currentIndex = STAGE_ORDER.indexOf(currentVisible as FlowStage);

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
          {STAGE_ORDER.map((stage, i) => {
            const completed = currentIndex > i;
            const isCurrent = currentIndex === i;
            return (
              <li key={stage} className="relative flex gap-3 pb-6 last:pb-0">
                {i < STAGE_ORDER.length - 1 && <span className="absolute left-[11px] top-6 h-full w-px bg-navy-line/30" aria-hidden="true" />}
                <span
                  className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-caption transition-colors duration-300 ${
                    completed ? "bg-ink text-paper" : isCurrent ? "border-2 border-gold-deep text-gold-deep" : "border border-navy-line/40 text-slate"
                  }`}
                >
                  {completed ? "✓" : i + 1}
                </span>
                <p className={`text-small ${isCurrent ? "text-ink" : "text-slate"}`}>{STAGE_LABELS[stage]}</p>
              </li>
            );
          })}
        </ol>
      </RiseIn>

      <RiseIn index={2} className="mt-6">
        <ProgressBar fraction={Math.max(0, currentIndex) / (STAGE_ORDER.length - 1)} />
      </RiseIn>

      <div className="mt-10">
        <Outlet context={{ flow, refreshFlow: () => getProfile().then((p) => setFlow(p.flow)) }} />
      </div>
    </div>
  );
}
