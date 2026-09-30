import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";
import { LogoLockup } from "@/components/ui/Logo";
import Icon, { type IconName } from "@/components/ui/Icon";
import RouteFade from "@/components/motion/RouteFade";
import { houseTransition } from "@/lib/motion";
import { useAuth } from "@/lib/AuthContext";
import { LiveDot } from "./components/DashboardUI";

type NavItem = { to: string; label: string; icon: IconName; end?: boolean };

/** Investor dashboard is the deposit/managed-strategy product. Market chat
 *  is a separate informational market-data view; it never affects a cycle
 *  or places a trade. Trader dashboard is self-directed and has analytics. */
const INVESTOR_NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: "overview", end: true },
  { to: "/dashboard/market-chat", label: "Market Chat", icon: "marketChat" },
  { to: "/dashboard/funding", label: "Funding", icon: "funding" },
  { to: "/dashboard/withdraw", label: "Withdraw", icon: "withdraw" },
  { to: "/dashboard/transactions", label: "Activity", icon: "transactions" },
  { to: "/dashboard/history", label: "History", icon: "history" },
  { to: "/dashboard/profile", label: "Profile", icon: "profile" },
];

const TRADER_NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Analytics", icon: "analytics", end: true },
  { to: "/dashboard/market-chat", label: "Market Chat", icon: "marketChat" },
  { to: "/dashboard/billing", label: "Billing", icon: "billing" },
  { to: "/dashboard/profile", label: "Profile", icon: "profile" },
];

function navItemsFor(accountType: string | undefined): NavItem[] {
  return accountType === "trader" ? TRADER_NAV_ITEMS : INVESTOR_NAV_ITEMS;
}

/** A small, real-time clock — the one unmistakably "live trading platform"
 *  signal that a static screenshot can't fake. Updates every second; ticks
 *  independently of any page's own data fetching. */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono-figure tabular-nums">
      {now.toLocaleTimeString("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} UTC
    </span>
  );
}

function DesktopNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink to={item.to} end={item.end} className="group relative block px-3 active:scale-[0.98]" style={{ transition: "transform 0.15s ease" }}>
      {({ isActive }) => (
        <span className="relative flex items-center gap-3 px-3 py-2.5">
          {isActive && (
            <motion.span
              layoutId="dashboard-nav-active"
              transition={houseTransition}
              className="absolute inset-0 border-l-2 border-gold bg-navy"
            />
          )}
          <Icon
            name={item.icon}
            size={18}
            strokeWidth={1.75}
            className={clsx(
              "relative shrink-0 transition-all duration-200 group-hover:scale-110",
              isActive ? "text-gold" : "text-slate-light group-hover:text-gold-light"
            )}
          />
          <span
            className={clsx(
              "relative text-small transition-colors duration-200",
              isActive ? "text-paper" : "text-slate-light group-hover:text-paper"
            )}
          >
            {item.label}
          </span>
        </span>
      )}
    </NavLink>
  );
}

function MobileNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-2 active:scale-90"
      style={{ transition: "transform 0.15s ease" }}
    >
      {({ isActive }) => (
        <>
          <motion.span
            animate={isActive ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Icon name={item.icon} size={20} strokeWidth={1.75} className={isActive ? "text-gold" : "text-slate-light"} />
          </motion.span>
          <span className={clsx("text-[10px] leading-none tracking-tight", isActive ? "text-paper" : "text-slate-light")}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

/** Gates every dashboard page the same way: must be authenticated and have
 *  completed onboarding. The backend enforces the equivalent boundary on
 *  every real endpoint this section calls — this is a UX redirect, not the
 *  actual security boundary, same as OnboardingLayout's resumability
 *  redirect.
 *
 *  Dark, dense trading-platform shell (2026-09-29, restructured 2026-09-30
 *  after the first pass read as a reskin, not a redesign) — a real icon
 *  sidebar on desktop, and on mobile a fixed bottom tab bar instead of the
 *  old horizontal-scrolling strip, matching how actual trading apps
 *  (Robinhood, Coinbase, MT5 mobile) put primary navigation within thumb
 *  reach rather than at the top of the screen. */
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
      {/* Desktop sidebar */}
      <aside className="relative hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-navy-line/40 md:bg-navy-deep">
        <div className="flex items-center justify-between px-6 py-5">
          <Link to="/" aria-label="Nouveau — home">
            <LogoLockup tone="dark" />
          </Link>
        </div>

        <div className="px-6 pb-4">
          <span className="inline-block border border-gold/30 px-2 py-0.5 font-mono-figure text-caption tracking-[0.1em] text-gold">
            {modeBadge}
          </span>
        </div>

        <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-0.5 py-2">
          {navItems.map((item) => (
            <DesktopNavLink key={item.to} item={item} />
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mx-6 mb-6 flex items-center gap-2 text-caption text-slate-light hover:text-paper"
        >
          <Icon name="logout" size={15} strokeWidth={1.75} />
          Log out
        </button>
      </aside>

      {/* Mobile top header */}
      <header className="flex items-center justify-between border-b border-navy-line/40 bg-navy-deep px-4 py-4 md:hidden">
        <Link to="/" aria-label="Nouveau — home">
          <LogoLockup tone="dark" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="border border-gold/30 px-1.5 py-0.5 font-mono-figure text-[10px] tracking-[0.1em] text-gold">
            {modeBadge}
          </span>
          <button type="button" onClick={handleLogout} aria-label="Log out" className="text-slate-light hover:text-paper">
            <Icon name="logout" size={18} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <main className="flex-1 bg-navy-deep px-4 pb-24 pt-6 md:px-10 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-6 flex items-center justify-between border-b border-navy-line/30 pb-3 text-caption text-slate-light">
            <span className="flex items-center gap-2 uppercase tracking-[0.1em]">
              <LiveDot />
              {modeBadge === "TRADER" ? "Live market data" : "Account dashboard"}
            </span>
            <LiveClock />
          </div>
          <RouteFade />
        </div>
      </main>

      {/* Mobile bottom tab bar — fixed, within thumb reach, replaces the old scrolling top strip. */}
      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-navy-line/40 bg-navy-deep pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {navItems.map((item) => (
          <MobileNavLink key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}
