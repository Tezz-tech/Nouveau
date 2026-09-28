import { useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";
import Glow from "@/components/ui/Glow";
import { LogoLockup } from "@/components/ui/Logo";
import RouteFade from "@/components/motion/RouteFade";
import { houseTransition } from "@/lib/motion";
import { useAuth } from "@/lib/AuthContext";

type NavItem = { to: string; label: string; end?: boolean };

/** Investor dashboard is the deposit/AI-trading product built earlier — no
 *  analytics/signals here, since an investor doesn't self-trade. Trader
 *  dashboard is the self-directed product: analytics is the home page, and
 *  there are no deposit-flow pages at all — Nouveau never holds a trader's
 *  money. */
const INVESTOR_NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/funding", label: "Funding" },
  { to: "/dashboard/withdraw", label: "Withdraw" },
  { to: "/dashboard/transactions", label: "Transactions" },
  { to: "/dashboard/history", label: "Trading history" },
  { to: "/dashboard/profile", label: "Profile" },
];

const TRADER_NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Analytics", end: true },
  { to: "/dashboard/billing", label: "Billing" },
  { to: "/dashboard/profile", label: "Profile" },
];

function navItemsFor(accountType: string | undefined): NavItem[] {
  return accountType === "trader" ? TRADER_NAV_ITEMS : INVESTOR_NAV_ITEMS;
}

/** Gates every dashboard page the same way: must be authenticated and have
 *  completed onboarding. The backend enforces the equivalent boundary on
 *  every real endpoint this section calls — this is a UX redirect, not the
 *  actual security boundary, same as OnboardingLayout's resumability
 *  redirect.
 *
 *  Dark, dense trading-platform shell (2026-09-28) — deliberately its own
 *  visual system from the light/editorial marketing site and onboarding
 *  wizard, which keep their existing look untouched. */
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
    return (
      <div className="on-dark flex min-h-[100svh] items-center justify-center bg-navy-deep text-body text-slate-light">
        Loading…
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const navItems = navItemsFor(onboarding?.accountType);
  const modeBadge = onboarding?.accountType === "trader" ? "TRADER" : "INVESTOR";

  return (
    <div className="on-dark min-h-[100svh] bg-navy-deep md:flex">
      <aside className="relative overflow-hidden border-b border-navy-line/40 bg-navy-deep md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <Glow tone="gold" size={280} className="pointer-events-none -left-24 -top-24 opacity-[0.08]" />

        <div className="relative flex items-center justify-between px-6 py-5">
          <Link to="/" aria-label="Nouveau — home">
            <LogoLockup tone="dark" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-caption text-slate-light underline decoration-navy-line underline-offset-4 hover:text-paper md:hidden"
          >
            Log out
          </button>
        </div>

        <div className="relative px-6 pb-4">
          <span className="inline-block border border-gold/30 px-2 py-0.5 font-mono-figure text-caption tracking-[0.1em] text-gold">
            {modeBadge}
          </span>
        </div>

        <nav aria-label="Dashboard" className="relative flex gap-1 overflow-x-auto px-4 pb-4 md:flex-col md:gap-0.5 md:pb-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="relative whitespace-nowrap px-3 py-2.5 text-small md:w-full"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="dashboard-nav-active"
                      transition={houseTransition}
                      className="absolute inset-0 border-l-2 border-gold bg-navy"
                    />
                  )}
                  <span
                    className={clsx(
                      "relative transition-colors duration-200",
                      isActive ? "text-paper" : "text-slate-light hover:text-paper"
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
            className="text-caption text-slate-light underline decoration-navy-line underline-offset-4 hover:text-paper"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-navy-deep px-6 py-10 md:px-10">
        <div className="mx-auto max-w-[1040px]">
          <RouteFade />
        </div>
      </main>
    </div>
  );
}
