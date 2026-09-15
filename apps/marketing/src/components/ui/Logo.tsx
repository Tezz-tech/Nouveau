import clsx from "clsx";

/** Just the gold icon mark, cropped from the source lockup. Transparent
 *  background — works on any surface. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/images/logo-mark.png"
      alt=""
      className={clsx("w-auto object-contain", className)}
    />
  );
}

/** Icon mark + live "Nouveau" text, for surfaces that toggle between light
 *  and dark (the header) — the source lockup's wordmark is cream/white and
 *  only reads on a dark surface, so here the wordmark is real text that
 *  adopts the surface's ink/paper color instead of a fixed image color. */
export function LogoLockup({
  tone = "light",
  className,
  markClassName,
}: {
  tone?: "light" | "dark";
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={clsx("h-8", markClassName)} />
      <span
        className={clsx(
          "font-display text-h3",
          tone === "dark" ? "text-paper" : "text-ink"
        )}
      >
        Nouveau
      </span>
    </span>
  );
}

/** The full raster lockup (icon + cream wordmark baked in). Only use this
 *  on surfaces that are always dark (navy/navy-deep) — the wordmark is not
 *  legible on paper/paper-2. */
export function LogoFull({ className }: { className?: string }) {
  return (
    <img
      src="/images/logo-full.png"
      alt="Nouveau"
      className={clsx("w-auto object-contain", className)}
    />
  );
}
