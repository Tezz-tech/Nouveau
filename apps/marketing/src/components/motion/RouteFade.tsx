import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation, useOutlet } from "react-router-dom";
import { easeHouse } from "@/lib/motion";

/**
 * A small local cross-fade between nested-route content (an onboarding
 * step, a dashboard tab), layered on top of PageWipe's full-screen
 * transition — that one covers the whole viewport on any route change
 * everywhere in the app; this one gives just this section's own content a
 * bit of life on its own.
 *
 * Deliberately NOT `mode="wait"` and deliberately quick (0.18s) — an
 * earlier version used `durations.fast` (0.4s) with `mode="wait"`, which
 * forces the old content to fully fade out (blank screen) before the new
 * content starts fading in, so a single dashboard tab click could mean
 * ~800ms of blank content. Overlapping enter/exit here keeps it feeling
 * instant for a click-driven nav, unlike onboarding's slower, deliberate
 * step-to-step pacing (which already has an async submit to wait through
 * regardless).
 */
export default function RouteFade() {
  const location = useLocation();
  const outlet = useOutlet();
  const reduced = useReducedMotion();

  if (reduced) return outlet;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: easeHouse }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
