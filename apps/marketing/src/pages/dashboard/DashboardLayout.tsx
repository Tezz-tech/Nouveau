import { useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";
import Glow from "@/components/ui/Glow";
import { LogoLockup } from "@/components/ui/Logo";
import RouteFade from "@/components/motion/RouteFade";
import { houseTransition } from "@/lib/motion";
import { useAuth } from "@/lib/AuthContext";

const NAV_ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/analytics", label: "Fundamental Analysis" },
  { to: "/dashboard/funding", label: "Funding" },
  { to: "/dashboard/withdraw", label: "Withdraw" },
  { to: "/dashboard/transactions", label: "Transactions" },
  { to: "/dashboard/history", label: "Trading history" },
  { to: "/dashboard/profile", label: "Profile" },
];

/** Gates every dashboard page the same way: must be authenticated and have
 *  completed onboarding. The backend enforces the equivalent boundary on
 *  every real endpoint this section calls — this is a UX redirect, not the
 *  actual security boundary, same as OnboardingLayout's resumability
 *  redirect. */
export default function DashboardLayout() {
  const { loading, authenticated, onboarding, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (onboarding && onboarding.nextStep !== "complete") {
      navigate("/onboarding", { replace: true });
    }
  }, [loading, authenticated, onboarding, navigate]);

  // Deliberately NOT gated on `loading` too — see the identical note in
  // OnboardingLayout.tsx. `loading` flips true on every background
  // refresh() after an action, not just the first load, and `authenticated`/
  // `onboarding` both keep their last-known value during that window, so
  // gating on `loading` here would unmount and remount every dashboard
  // page (losing in-progress local state — e.g. an in-progress Analytics
  // sketch stroke) on every single API call, not just real access-control
  // transitions.
  if (!authenticated || onboarding?.nextStep !== "complete") {
    return <div className="p-6 text-body text-slate">Loading…</div>;
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-[100svh] md:flex">
      <aside className="relative overflow-hidden border-b border-navy-line/15 bg-paper md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <Glow tone="navy" size={280} className="pointer-events-none -left-24 -top-24 opacity-60" />

        <div className="relative flex items-center justify-between px-6 py-5">
          <Link to="/" aria-label="Nouveau — home">
            <LogoLockup tone="light" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-caption text-ink underline decoration-navy-line underline-offset-4 md:hidden"
          >
            Log out
          </button>
        </div>
        <nav aria-label="Dashboard" className="relative flex gap-1 overflow-x-auto px-4 pb-4 md:flex-col md:gap-0.5 md:pb-6">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="relative whitespace-nowrap px-3 py-2 text-small md:w-full"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="dashboard-nav-active"
                      transition={houseTransition}
                      className="absolute inset-0 bg-ink"
                    />
                  )}
                  <span
                    className={clsx(
                      "relative transition-colors duration-200",
                      isActive ? "text-paper" : "text-slate hover:text-ink"
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="relative hidden px-4 pb-6 md:block">
          <button
            type="button"
            onClick={handleLogout}
            className="text-caption text-ink underline decoration-navy-line underline-offset-4"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 px-6 py-10 md:px-10">
        <div className="mx-auto max-w-[820px]">
          <RouteFade />
        </div>
      </main>
    </div>
  );
}
