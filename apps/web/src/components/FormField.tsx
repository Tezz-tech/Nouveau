import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

export function TextField({
  label,
  name,
  error,
  hint,
  ...rest
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className="mt-1 w-full border border-navy-line/40 bg-paper px-3 py-2 text-sm text-ink focus:border-gold-deep focus:outline-none"
        {...rest}
      />
      {hint && !error && (
        <p id={`${name}-hint`} className="mt-1 text-xs text-slate">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-ink">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  name,
  error,
  options,
  ...rest
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={name}
        name={name}
        className="mt-1 w-full border border-navy-line/40 bg-paper px-3 py-2 text-sm text-ink focus:border-gold-deep focus:outline-none"
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-ink">{error}</p>}
    </div>
  );
}

export function Button({
  children,
  variant = "solid",
  ...rest
}: {
  children: React.ReactNode;
  variant?: "solid" | "text";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "text-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";
  const solid = "bg-ink px-4 py-2.5 text-paper hover:bg-navy w-full";
  const text = "text-gold-deep hover:underline";
  return (
    <button className={`${base} ${variant === "solid" ? solid : text}`} {...rest}>
      {children}
    </button>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="border border-ink bg-paper-2 px-3 py-2 text-sm text-ink">
      {message}
    </div>
  );
}
