import clsx from "clsx";
import type { ReactNode } from "react";

export default function PlanCard({
  name,
  price,
  cadence,
  description,
  recommended,
  footer,
}: {
  name: string;
  price: string;
  cadence: string;
  description: string;
  recommended?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex h-full flex-col justify-between border p-8",
        recommended ? "border-gold-deep" : "border-navy-line/25"
      )}
    >
      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-h3 text-ink">{name}</h3>
          {recommended && (
            <span className="text-caption uppercase tracking-[0.08em] text-ink">
              Recommended
            </span>
          )}
        </div>
        <p className="mt-4 flex items-baseline gap-2">
          <span className="font-mono-figure text-4xl text-ink">{price}</span>
          <span className="text-small text-slate">{cadence}</span>
        </p>
        <p className="mt-4 text-small text-slate">{description}</p>
      </div>
      {footer && <div className="mt-8">{footer}</div>}
    </div>
  );
}
