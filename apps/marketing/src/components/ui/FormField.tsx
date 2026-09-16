import {
  useState,
  type ButtonHTMLAttributes,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import clsx from "clsx";

const fieldBase =
  "w-full border-0 border-b bg-transparent px-0 py-3 font-text text-body text-ink placeholder:text-slate/60 transition-colors duration-300 ease-house focus:outline-none disabled:cursor-not-allowed disabled:text-slate/50";
const borderIdle = "border-navy-line/40";
const borderFocus = "focus:border-gold-deep";
const borderError = "aria-[invalid=true]:border-2 aria-[invalid=true]:border-ink";

function useValidation(required?: boolean) {
  const [touched, setTouched] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const onBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTouched(true);
    setInvalid(required ? !e.target.checkValidity() : false);
  };
  return { touched, invalid, onBlur };
}

export function TextField({
  label,
  name,
  type = "text",
  required,
  errorMessage,
  className,
  ...rest
}: {
  label: string;
  name: string;
  errorMessage?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const { invalid, onBlur } = useValidation(required);
  const errorId = `${name}-error`;

  return (
    <div className={className}>
      <label htmlFor={name} className="text-caption uppercase tracking-[0.06em] text-slate">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onBlur={onBlur}
        className={clsx(fieldBase, borderIdle, borderFocus, borderError, "mt-2")}
        {...rest}
      />
      {invalid && (
        <p id={errorId} className="mt-2 text-caption text-ink">
          {errorMessage ?? `Enter a valid ${label.toLowerCase()}.`}
        </p>
      )}
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  required,
  className,
  ...rest
}: {
  label: string;
  name: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { invalid, onBlur } = useValidation(required);

  return (
    <div className={className}>
      <label htmlFor={name} className="text-caption uppercase tracking-[0.06em] text-slate">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <textarea
        id={name}
        name={name}
        required={required}
        aria-invalid={invalid}
        onBlur={onBlur}
        rows={5}
        className={clsx(fieldBase, borderIdle, borderFocus, borderError, "mt-2 resize-none")}
        {...rest}
      />
    </div>
  );
}

export function SelectField({
  label,
  name,
  required,
  options,
  className,
  ...rest
}: {
  label: string;
  name: string;
  options: string[] | { value: string; label: string }[];
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="text-caption uppercase tracking-[0.06em] text-slate">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        className={clsx(fieldBase, borderIdle, borderFocus, "mt-2")}
        {...rest}
      >
        {options.map((opt) =>
          typeof opt === "string" ? (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ) : (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        )}
      </select>
    </div>
  );
}

/** A submit button matching the site's existing form-button treatment
 *  (previously duplicated inline on Login/Signup) — same disabled styling
 *  as the risk-acknowledgement-gated signup button. */
export function SubmitButton({
  children,
  className,
  ...rest
}: { children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      className={clsx(
        "w-full bg-ink px-6 py-3.5 text-small text-paper transition-colors duration-300 hover:bg-navy disabled:cursor-not-allowed disabled:bg-navy-line/30 disabled:text-slate/70 disabled:hover:bg-navy-line/30",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Inline error display for real form-submission failures (as opposed to
 *  the gold-toned status/hint text used for design-preview messaging). */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="border border-ink bg-paper-2 px-4 py-3 text-small text-ink">
      {message}
    </div>
  );
}
