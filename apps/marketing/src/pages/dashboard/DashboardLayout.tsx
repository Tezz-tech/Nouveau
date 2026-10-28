import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";
import { LogoLockup } from "@/components/ui/Logo";
import Icon, { type IconName } from "@/components/ui/Icon";
import { useAuth } from "@/lib/AuthContext";
import { LiveDot } from "./components/DashboardUI";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: "overview", end: true },
  { to: "/dashboard/billing", label: "Billing", icon: "billing" },
  { to: "/dashboard/profile", label: "Profile", icon: "profile" },
];

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono-figure text-caption text-slate-light">{now.toLocaleTimeString("en-US", { timeZone: "UTC", hour12: false })} UTC</span>;
}

function DesktopNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        clsx(
          "group flex items-center gap-3 px-4 py-2.5 text-small transition-colors duration-200",
          isActive ? "bg-navy text-paper" : "text-slate-light hover:bg-navy/60 hover:text-paper"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={item.icon} size={16} strokeWidth={1.75} className={clsx("transition-transform duration-200", isActive && "scale-110")} />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

function MobileNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => clsx("flex flex-1 flex-col items-center gap-1 py-2.5 text-caption", isActive ? "text-gold" : "text-slate-light")}
    >
      {({ isActive }) => (
        <>
          <motion.span animate={isActive ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
            <Icon name={item.icon} size={20} strokeWidth={1.75} />
          </motion.span>
          {item.label}
        </>
      )}
    </NavLink>
  );
}

export default function DashboardLayout() {
  const { loading, authenticated, role, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !authenticated) navigate("/login", { replace: true });
  }, [loading, authenticated, navigate]);

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  if (loading || !authenticated) {
    return <div className="min-h-[100svh] bg-navy-deep p-6 text-body text-slate-light">Loading…</div>;
  }

  return (
    <div className="min-h-[100svh] bg-navy-deep text-paper">
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col md:border-r md:border-navy-line/40 md:bg-navy-deep">
        <Link to="/" aria-label="Nouveau — home" className="flex items-center gap-2 px-5 py-6">
          <LogoLockup tone="dark" />
        </Link>
        <nav aria-label="Dashboard" className="mt-4 flex flex-1 flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => (
            <DesktopNavLink key={item.to} item={item} />
          ))}
        </nav>
        {role === "admin" && (
          <Link
            to="/admin"
            className="mx-2 mb-2 flex items-center gap-3 border border-gold/30 px-4 py-2.5 text-small text-gold transition-colors duration-200 hover:bg-gold/10"
          >
            <Icon name="target" size={16} strokeWidth={1.75} />
            Admin
          </Link>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="m-2 flex items-center gap-3 px-4 py-2.5 text-small text-slate-light transition-colors duration-200 hover:bg-navy/60 hover:text-paper"
        >
          <Icon name="logout" size={16} strokeWidth={1.75} />
          Log out
        </button>
      </aside>

      <header className="flex items-center justify-between border-b border-navy-line/40 bg-navy-deep px-4 py-4 md:hidden">
        <Link to="/" aria-label="Nouveau — home">
          <LogoLockup tone="dark" />
        </Link>
        <button type="button" onClick={onLogout} aria-label="Log out" className="p-2 text-slate-light">
          <Icon name="logout" size={18} strokeWidth={1.75} />
        </button>
      </header>

      <main className="pb-24 pt-6 md:ml-60 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="mb-6 flex items-center justify-between gap-2 text-caption">
            <span className="flex items-center gap-2">
              <LiveDot /> Account dashboard
            </span>
            <LiveClock />
          </div>
          <Outlet />
        </div>
      </main>

      <nav aria-label="Dashboard" className="fixed inset-x-0 bottom-0 z-50 flex border-t border-navy-line/40 bg-navy-deep md:hidden">
        {NAV_ITEMS.map((item) => (
          <MobileNavLink key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}
