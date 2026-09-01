import { motion, useReducedMotion } from "framer-motion";
import { hairlineDraw, viewportOnce } from "@/lib/motion";
import clsx from "clsx";

/** A gold hairline that draws left-to-right when scrolled into view, once. */
export default function Hairline({
  className,
  tone = "light",
  delay = 0,
}: {
  className?: string;
  tone?: "light" | "dark";
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const color = tone === "dark" ? "bg-gold" : "bg-gold-deep";

  if (reduced) {
    return <div className={clsx("h-px", color, className)} aria-hidden="true" />;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={hairlineDraw}
      transition={{ delay }}
      style={{ transformOrigin: "left" }}
      className={clsx("h-px", color, className)}
      aria-hidden="true"
    />
  );
}
