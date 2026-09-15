import { useLayoutEffect, useRef } from "react";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { easeHouse } from "@/lib/motion";

/** A brief navy wipe that covers the viewport the instant a route changes,
 *  then draws back to reveal the new page. Skipped on first load and under
 *  reduced motion. */
export default function PageWipe() {
  const location = useLocation();
  const controls = useAnimation();
  const reduced = useReducedMotion();
  const firstRender = useRef(true);

  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reduced) return;
    controls.set({ scaleY: 1 });
    controls.start({
      scaleY: 0,
      transition: { duration: 0.42, ease: easeHouse, delay: 0.04 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (reduced) return null;

  return (
    <motion.div
      initial={{ scaleY: 0 }}
      animate={controls}
      style={{ transformOrigin: "bottom" }}
      className="pointer-events-none fixed inset-0 z-[100] bg-navy-deep"
      aria-hidden="true"
    />
  );
}
