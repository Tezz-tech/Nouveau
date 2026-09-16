import { useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { LogoLockup } from "@/components/ui/Logo";
import { useAuth } from "@/lib/AuthContext";

const NAV_ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: "/dashboard", label: "Overview", end: true },
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

  if (loading || !authenticated || onboarding?.nextStep !== "complete") {
    return <div className="p-6 text-body text-slate">Loading…</div>;
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-[100svh] md:flex">
      <aside className="border-b border-navy-line/15 bg-paper md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-6 py-5">
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
        <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto px-4 pb-4 md:flex-col md:gap-0.5 md:pb-6">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "whitespace-nowrap px-3 py-2 text-small transition-colors duration-200 md:w-full",
                  isActive ? "bg-ink text-paper" : "text-slate hover:text-ink"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-4 pb-6 md:block">
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
          <Outlet />
        </div>
      </main>
    </div>
  );
}
