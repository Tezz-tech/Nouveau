import { motion, useReducedMotion } from "framer-motion";
import { houseTransition } from "@/lib/motion";

/** Shared by OnboardingLayout (light, the default) and the dashboard
 *  Overview (`tone="dark"`) — animates its fill from 0 on mount and
 *  smoothly on every value change afterward, rather than snapping straight
 *  to the target width. */
export default function ProgressBar({ fraction, tone = "light" }: { fraction: number; tone?: "light" | "dark" }) {
  const reduced = useReducedMotion();
  const pct = Math.min(100, Math.max(0, fraction * 100));

  return (
    <div className={tone === "dark" ? "h-1 w-full bg-navy-line/40" : "h-1 w-full bg-paper-2"}>
      <motion.div
        className={tone === "dark" ? "h-1 bg-gold" : "h-1 bg-gold-deep"}
        initial={reduced ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={reduced ? { duration: 0 } : houseTransition}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
