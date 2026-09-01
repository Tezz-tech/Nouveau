import CountUp from "@/components/motion/CountUp";
import Hairline from "@/components/motion/Hairline";
import clsx from "clsx";

export default function StatFigure({
  value,
  prefix = "$",
  label,
  tone = "light",
  size = "lg",
}: {
  value: number;
  prefix?: string;
  label: string;
  tone?: "light" | "dark";
  size?: "lg" | "md";
}) {
  return (
    <div>
      <CountUp
        value={value}
        prefix={prefix}
        className={clsx(
          size === "lg" ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl",
          tone === "dark" ? "text-paper" : "text-ink"
        )}
      />
      <Hairline tone={tone} className="mt-3 w-12" />
      <p
        className={clsx(
          "mt-3 text-small",
          tone === "dark" ? "text-slate" : "text-slate"
        )}
      >
        {label}
      </p>
    </div>
  );
}
