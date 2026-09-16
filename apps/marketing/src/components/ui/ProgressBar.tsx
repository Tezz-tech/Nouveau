import { motion, useReducedMotion } from "framer-motion";
import { houseTransition } from "@/lib/motion";

/** Shared by OnboardingLayout and the dashboard Overview — animates its
 *  fill from 0 on mount and smoothly on every value change afterward,
 *  rather than snapping straight to the target width. */
export default function ProgressBar({ fraction }: { fraction: number }) {
  const reduced = useReducedMotion();
  const pct = Math.min(100, Math.max(0, fraction * 100));

  return (
    <div className="h-1 w-full bg-paper-2">
      <motion.div
        className="h-1 bg-gold-deep"
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
