import type { Variants, Transition } from "framer-motion";

/** House easing curve. Use everywhere motion needs to feel deliberate, never snappy. */
export const easeHouse = [0.22, 1, 0.36, 1] as const;

export const durations = {
  fast: 0.4,
  base: 0.6,
  slow: 0.9,
  hero: 1.2,
} as const;

export const staggerChildren = {
  tight: 0.06,
  base: 0.08,
  loose: 0.09,
} as const;

/** Line-by-line clip-path reveal, rising from below. Used for the hero headline only —
 *  this is the site's signature text entrance and loses its weight if reused elsewhere. */
export const clipRiseLine: Variants = {
  hidden: { clipPath: "inset(100% 0 0 0)", y: "0.15em" },
  visible: (i: number = 0) => ({
    clipPath: "inset(0% 0 0 0)",
    y: 0,
    transition: {
      duration: durations.slow,
      ease: easeHouse,
      delay: i * staggerChildren.loose,
    },
  }),
};

/** A gold hairline that draws left to right. Used sparingly — under headings, stats, section marks. */
export const hairlineDraw: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: durations.base, ease: easeHouse },
  },
};

/** Vertical hairline draw, used on the split sequence dividers. */
export const hairlineDrawVertical: Variants = {
  hidden: { scaleY: 0 },
  visible: {
    scaleY: 1,
    transition: { duration: durations.base, ease: easeHouse },
  },
};

/** Editorial entrance: a small leftward settle, not a vertical fade-up. Used for
 *  paragraph blocks in the mechanism sequence, distinct from the hero and from stats. */
export const settleFromLeft: Variants = {
  hidden: { opacity: 0, x: -14 },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.base,
      ease: easeHouse,
      delay: i * staggerChildren.base,
    },
  }),
};

/** Plain opacity settle for dense copy blocks (accordions, pull quotes) where
 *  directional movement would be noise. */
export const softAppear: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.base, ease: easeHouse },
  },
};

/** General-purpose entrance for the authenticated app (onboarding,
 *  dashboard) — a small rise + fade, staggerable via the `custom` index.
 *  Distinct from the marketing site's signature effects above
 *  (`clipRiseLine`, `hairlineDraw`), which are one-off and lose their
 *  weight if reused; this one is meant to be used often, on cards, list
 *  rows, and form content. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: durations.fast, ease: easeHouse, delay: i * staggerChildren.tight },
  }),
};

export const staggerContainer = (stagger: number = staggerChildren.base): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger,
    },
  },
});

export const houseTransition: Transition = {
  duration: durations.base,
  ease: easeHouse,
};

export const pageWipeTransition: Transition = {
  duration: 0.45,
  ease: easeHouse,
};

export const viewportOnce = { once: true, margin: "-10% 0px -10% 0px" } as const;
