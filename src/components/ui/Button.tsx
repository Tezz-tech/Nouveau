import { Link } from "react-router-dom";
import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = {
  children: ReactNode;
  variant?: "solid" | "text";
  tone?: "light" | "dark";
  className?: string;
  to?: string;
  external?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

const base =
  "inline-flex items-center gap-2 font-text text-small transition-colors duration-300 ease-house";

const solidLight =
  "bg-ink text-paper px-6 py-3.5 hover:bg-navy";
const solidDark =
  "bg-paper text-navy px-6 py-3.5 hover:bg-gold-light";

function TextLabel({ children }: { children: ReactNode }) {
  return (
    <span className="relative pb-0.5">
      {children}
      <span
        className="absolute left-0 -bottom-0.5 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 ease-house group-hover:scale-x-100"
        aria-hidden="true"
      />
    </span>
  );
}

export function Button({
  children,
  variant = "solid",
  tone = "light",
  className,
  to,
  external,
  ...rest
}: Props) {
  if (variant === "text") {
    const textClass = clsx(
      "group font-text text-small",
      tone === "dark" ? "text-paper" : "text-ink",
      className
    );
    if (to) {
      return external ? (
        <a href={to} className={textClass} target="_blank" rel="noreferrer">
          <TextLabel>{children}</TextLabel>
        </a>
      ) : (
        <Link to={to} className={textClass}>
          <TextLabel>{children}</TextLabel>
        </Link>
      );
    }
    return (
      <button
        type="button"
        className={textClass}
        {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        <TextLabel>{children}</TextLabel>
      </button>
    );
  }

  const solidClass = clsx(base, tone === "dark" ? solidDark : solidLight, className);

  if (to) {
    return (
      <Link to={to} className={solidClass}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={solidClass} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
