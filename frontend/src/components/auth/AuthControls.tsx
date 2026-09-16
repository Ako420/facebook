import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from "react";
import { Icon } from "../icons/Icon";
import { cn } from "../../lib/cn";

const fieldBase =
  "w-full rounded-[10px] border bg-surface-raised px-4 text-ink outline-none transition-colors placeholder:text-ink-faint disabled:opacity-60";

const tone = (invalid: boolean) =>
  invalid
    ? "border-alert focus:border-alert"
    : "border-line focus:border-brand focus:shadow-focus";

function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-alert">
      {children}
    </p>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
    </label>
  );
}

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  id: string;
  label?: string;
  error?: string;
  invalid?: boolean;
  size?: "md" | "lg";
}

export function TextField({
  id,
  label,
  error,
  invalid = false,
  size = "md",
  className,
  ...input
}: TextFieldProps) {
  const showError = Boolean(error) || invalid;
  return (
    <div className={className}>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <input
        id={id}
        aria-invalid={showError || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          fieldBase,
          tone(showError),
          size === "lg" ? "h-13 text-base" : "h-12 text-sm",
        )}
        {...input}
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  id: string;
  label?: string;
  error?: string;
  invalid?: boolean;
  children: ReactNode;
}

export function SelectField({
  id,
  label,
  error,
  invalid = false,
  children,
  className,
  ...select
}: SelectFieldProps) {
  const showError = Boolean(error) || invalid;
  return (
    <div className={className}>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <div className="relative">
        <select
          id={id}
          aria-invalid={showError || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            fieldBase,
            tone(showError),
            "h-12 cursor-pointer appearance-none pr-10 text-sm [&>option]:bg-surface [&>option]:text-ink",
          )}
          {...select}
        >
          {children}
        </select>
        <Icon
          name="chevron-down"
          size={13}
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-muted"
        />
      </div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

interface ButtonProps {
  children: ReactNode;
  pending?: boolean;
  pendingLabel?: string;
  type?: "button" | "submit";
  variant?: "primary" | "accent" | "outline" | "ghost";
  onClick?: () => void;
  className?: string;
}

const variants = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  accent: "bg-accent text-white hover:bg-accent-hover",
  outline: "border border-brand bg-transparent text-brand hover:bg-brand-soft",
  ghost: "bg-surface-raised text-ink hover:bg-line",
};

export function AuthButton({
  children,
  pending = false,
  pendingLabel,
  type = "button",
  variant = "primary",
  onClick,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-pill text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        variants[variant],
        className,
      )}
    >
      {pending && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-pill border-2 border-current border-t-transparent"
        />
      )}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}


export function AuthAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-[10px] border border-alert/40 bg-alert-soft px-3 py-2.5 text-sm text-ink"
    >
      {message}
    </p>
  );
}
