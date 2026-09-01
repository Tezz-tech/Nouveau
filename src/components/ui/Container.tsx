import clsx from "clsx";
import type { ReactNode } from "react";

export default function Container({
  children,
  className,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={clsx(
        "mx-auto px-6 md:px-10",
        wide ? "max-w-[1400px]" : "max-w-[1120px]",
        className
      )}
    >
      {children}
    </div>
  );
}
