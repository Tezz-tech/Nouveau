import { useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { LogoLockup } from "@/components/ui/Logo";
import { useAuth } from "@/lib/AuthContext";

const TABS = [
  { to: "/admin", label: "Master Strategies", end: true },
  { to: "/admin/bot-plans", label: "Bot Plans" },
  { to: "/admin/users", label: "Users" },
];

/** Server-side `requireAdmin` (403) is the real boundary — this is just UX:
 *  don't flash admin screens at someone who isn't one, and don't make a
 *  non-admin stare at a 403 with no way out. */
export default function AdminLayout() {
  const { loading, authenticated, role, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (role !== "admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, authenticated, role, navigate]);

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  if (loading || !authenticated || role !== "admin") {
    return <div className="min-h-[100svh] bg-navy-deep p-6 text-body text-slate-light">Loading…</div>;
  }

  return (
    <div className="min-h-[100svh] bg-navy-deep text-paper">
      <header className="border-b border-navy-line/40">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-8">
          <div className="flex items-center gap-4">
            <Link to="/" aria-label="Nouveau — home">
              <LogoLockup tone="dark" />
            </Link>
            <span className="border border-gold/30 px-2 py-0.5 text-caption uppercase tracking-[0.08em] text-gold">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-caption text-slate-light hover:text-paper">
              Back to dashboard
            </Link>
            <button type="button" onClick={onLogout} className="text-caption text-slate-light hover:text-paper">
              Log out
            </button>
          </div>
        </div>
        <nav aria-label="Admin" className="mx-auto flex max-w-5xl gap-1 px-4 md:px-8">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                clsx(
                  "border-b-2 px-3 py-3 text-small transition-colors duration-200",
                  isActive ? "border-gold text-paper" : "border-transparent text-slate-light hover:text-paper"
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
