import clsx from "clsx";

type Tone = "gold" | "navy";

/** A soft, blurred radial glow used as background energy behind hero and section
 *  content — navy/gold only, never a rainbow gradient. Purely decorative. */
export default function Glow({
  tone = "gold",
  className,
  size = 560,
}: {
  tone?: Tone;
  className?: string;
  size?: number;
}) {
  const color = tone === "gold" ? "#C9A227" : "#0F2740";

  return (
    <div
      aria-hidden="true"
      className={clsx("pointer-events-none absolute rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: tone === "gold" ? 0.16 : 0.35,
        filter: "blur(60px)",
      }}
    />
  );
}
