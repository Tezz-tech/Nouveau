import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import clsx from "clsx";
import { primaryNav } from "@/content/site";
import MobileDrawer from "@/components/MobileDrawer";
import { LogoLockup } from "@/components/ui/Logo";

export default function Header() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [scrolled, setScrolled] = useState(!isHome);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setScrolled(!isHome ? true : window.scrollY > 64);
  }, [isHome, location.pathname]);

  useEffect(() => {
    if (!isHome) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 64);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const transparent = isHome && !scrolled;

  return (
    <>
      <header
        data-lenis-prevent
        className={clsx(
          "fixed inset-x-0 top-0 z-50 transition-colors duration-500 ease-house",
          transparent
            ? "border-b border-transparent bg-transparent"
            : "border-b border-navy-line/15 bg-paper/95 backdrop-blur-sm"
        )}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10">
          <Link to="/" aria-label="Nouveau — home">
            <LogoLockup tone={transparent ? "dark" : "light"} />
          </Link>

          <nav
            className={clsx(
              "hidden items-center gap-8 md:flex",
              transparent ? "text-paper" : "text-ink"
            )}
            aria-label="Primary"
          >
            {primaryNav.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group relative py-1 text-small"
              >
                {link.label}
                <span
                  className={clsx(
                    "absolute left-0 -bottom-0.5 h-px w-full origin-left scale-x-0 transition-transform duration-300 ease-house group-hover:scale-x-100",
                    transparent ? "bg-gold-light" : "bg-gold-deep"
                  )}
                  aria-hidden="true"
                />
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-6 md:flex">
            <Link
              to="/login"
              className={clsx(
                "text-small transition-colors duration-500",
                transparent ? "text-paper" : "text-ink"
              )}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className={clsx(
                "px-5 py-2.5 text-small transition-colors duration-300",
                transparent
                  ? "bg-paper text-navy hover:bg-gold-light"
                  : "bg-ink text-paper hover:bg-navy"
              )}
            >
              Open an account
            </Link>
          </div>

          <button
            type="button"
            style={{ touchAction: "manipulation" }}
            className={clsx(
              "-mr-2 p-2 md:hidden",
              transparent ? "text-paper" : "text-ink"
            )}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Rendered as a sibling of <header>, not a descendant — the header
          gets backdrop-blur once scrolled/off-home, and backdrop-filter on
          an ancestor establishes a containing block for position:fixed
          descendants, which would squash this drawer into the header's own
          ~84px height instead of the full viewport. */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
