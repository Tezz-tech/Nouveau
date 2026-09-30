import { type InputHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";
import RiseIn from "@/components/motion/RiseIn";
import Icon, { type IconName } from "@/components/ui/Icon";

/**
 * A small, dashboard-only dark UI kit — deliberately separate from
 * `components/ui/FormField.tsx`/`Button.tsx`, which stay light-surface for
 * the marketing site and onboarding wizard. Redesigning "the dashboard"
 * shouldn't risk the public site or signup flow's look, so this is scoped
 * to `pages/dashboard/` only.
 */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "border border-navy-line/50 bg-gradient-to-b from-navy to-navy-deep/60 px-5 py-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.6)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** The "Real account, simulated payments" / "Not live yet" style banner,
 *  now on a dark surface — used verbatim across most dashboard pages. */
export function InfoBanner({ children, index }: { children: ReactNode; index?: number }) {
  return (
    <RiseIn index={index}>
      <div className="border border-gold/30 bg-navy px-4 py-3 text-small text-paper">{children}</div>
    </RiseIn>
  );
}

/** A signed percentage change, colored green/red — the one place this
 *  dashboard uses color to mean something (gain vs. loss), never
 *  decoratively. Renders a neutral dash at exactly zero or when there's
 *  nothing yet to compare against. */
export function Delta({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value) || value === 0) {
    return <span className="font-mono-figure text-caption text-slate-light">—</span>;
  }
  const positive = value > 0;
  return (
    <span className={clsx("font-mono-figure text-caption", positive ? "text-gain" : "text-loss")}>
      {positive ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/** A minimal inline sparkline — deliberately not recharts, this is a tiny
 *  decorative trend line for a stat tile, not a real chart with axes or a
 *  tooltip (Overview's real equity chart handles that). */
export function Sparkline({ points, tone = "gold", className }: { points: number[]; tone?: "gold" | "gain" | "loss"; className?: string }) {
  if (points.length < 2) return null;
  const width = 100;
  const height = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)} ${(height - ((p - min) / range) * height).toFixed(2)}`).join(" ");
  const stroke = tone === "gain" ? "#34D399" : tone === "loss" ? "#F87171" : "#C9A227";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={clsx("h-7 w-full", className)} preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatTile({
  label,
  value,
  hint,
  delta,
  sparkline,
  icon,
  index = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  sparkline?: number[];
  icon?: IconName;
  index?: number;
}) {
  return (
    <RiseIn index={index}>
      <Card className="transition-all duration-300 ease-house hover:-translate-y-0.5 hover:border-gold/40">
        <div className="flex items-center justify-between gap-2">
          <p className="text-caption uppercase tracking-[0.08em] text-slate-light">{label}</p>
          {icon && <Icon name={icon} size={15} strokeWidth={1.75} className="shrink-0 text-gold/70" />}
        </div>
        <p className="mt-1.5 font-mono-figure text-h3 text-paper">{value}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-caption text-slate-light">{hint ?? " "}</p>
          {delta !== undefined && <Delta value={delta} />}
        </div>
        {sparkline && sparkline.length > 1 && <Sparkline points={sparkline} className="mt-2" />}
      </Card>
    </RiseIn>
  );
}

const darkFieldBase =
  "mt-2 w-full border-0 border-b border-navy-line bg-transparent px-0 py-3 font-mono-figure text-body text-paper placeholder:text-slate-light/40 transition-colors duration-300 ease-house focus:border-gold focus:outline-none disabled:cursor-not-allowed disabled:text-slate-light/40";

/** The one form field the dashboard's real forms (Funding/Withdraw) need —
 *  a dark-surface counterpart to `components/ui/FormField.tsx`'s
 *  `TextField`, not a general replacement for it. */
export function DarkTextField({
  label,
  name,
  className,
  ...rest
}: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="text-caption uppercase tracking-[0.08em] text-slate-light">
        {label}
      </label>
      <input id={name} name={name} className={darkFieldBase} {...rest} />
    </div>
  );
}

/** Dark-surface counterpart to `components/ui/FormField.tsx`'s
 *  `ErrorBanner` — same role (a real submission failure), different
 *  surface. */
export function DarkErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="border border-loss/50 bg-navy px-4 py-3 text-small text-paper">
      {message}
    </div>
  );
}

export function PageHeading({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display text-paper" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
      {children}
    </h1>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-h3 text-paper">{children}</h2>;
}
