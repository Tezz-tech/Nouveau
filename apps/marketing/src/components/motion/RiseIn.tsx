import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { riseIn } from "@/lib/motion";

const MOTION_TAG = {
  div: motion.div,
  li: motion.li,
  tr: motion.tr,
} as const;

/** Wraps content in the app's general-purpose entrance (see lib/motion.ts)
 *  and falls back to a plain, unanimated element under prefers-reduced-motion
 *  — the same pattern RevealLines uses on the marketing site. `index`
 *  drives stagger delay when several of these mount together. `as` picks
 *  the wrapper tag — default `div`, but `li`/`tr` when wrapping something
 *  that must be a direct child of a `ul`/`ol`/`table` (an extra `div` in
 *  between is invalid HTML there). */
export default function RiseIn({
  index = 0,
  className,
  as = "div",
  children,
}: {
  index?: number;
  className?: string;
  as?: keyof typeof MOTION_TAG;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const Tag = as;

  if (reduced) {
    const PlainTag = Tag;
    return <PlainTag className={className}>{children}</PlainTag>;
  }

  const MotionTag = MOTION_TAG[as];
  return (
    <MotionTag custom={index} initial="hidden" animate="visible" variants={riseIn} className={className}>
      {children}
    </MotionTag>
  );
}
