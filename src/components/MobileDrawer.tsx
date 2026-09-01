import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { primaryNav } from "@/content/site";
import { houseTransition } from "@/lib/motion";
import { LogoFull } from "@/components/ui/Logo";

export default function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      firstLinkRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="on-dark fixed inset-0 z-[70] flex flex-col bg-navy-deep"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={houseTransition}
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          ref={panelRef}
        >
          <div className="flex items-center justify-between px-6 py-6">
            <Link to="/" aria-label="Nouveau — home" onClick={onClose}>
              <LogoFull className="h-9" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="text-small text-gold-light"
              aria-label="Close menu"
            >
              Close
            </button>
          </div>
          <nav className="flex flex-1 flex-col justify-center gap-2 px-6">
            {primaryNav.map((link, i) => (
              <Link
                key={link.to}
                to={link.to}
                ref={i === 0 ? firstLinkRef : undefined}
                className="border-b border-navy-line py-4 font-display text-h3 text-paper transition-colors duration-300 hover:text-gold-light"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-4 px-6 pb-10">
            <Link to="/login" className="text-small text-gold-light">
              Log in
            </Link>
            <Link
              to="/signup"
              className="inline-flex w-fit items-center bg-paper px-6 py-3.5 text-small text-navy"
            >
              Open an account
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
