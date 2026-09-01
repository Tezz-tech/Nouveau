import { motion, useReducedMotion } from "framer-motion";
import { clipRiseLine, hairlineDraw } from "@/lib/motion";

/**
 * The hero's signature entrance: each line rises through a clip mask, staggered,
 * with a gold hairline drawing beneath once the last line settles. Used once,
 * on the home hero — repeating it elsewhere would dilute it into a tic.
 */
export default function RevealLines({
  lines,
  className,
  hairline = false,
}: {
  lines: string[];
  className?: string;
  hairline?: boolean;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className={className}>
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        {hairline && (
          <div className="mt-6 h-px w-24 bg-gold-light" aria-hidden="true" />
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {lines.map((line, i) => (
        <div key={i} style={{ overflow: "hidden" }}>
          <motion.div
            custom={i}
            initial="hidden"
            animate="visible"
            variants={clipRiseLine}
          >
            {line}
          </motion.div>
        </div>
      ))}
      {hairline && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={hairlineDraw}
          transition={{ delay: lines.length * 0.09 + 0.1 }}
          style={{ transformOrigin: "left" }}
          className="mt-6 h-px w-24 bg-gold-light"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
