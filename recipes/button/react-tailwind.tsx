import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

// Minimal className joiner (no runtime dep). Falsy values are dropped.
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner, sets aria-busy, and blocks interaction. Width stays fixed. */
  loading?: boolean;
  /** Optional leading icon (hidden while loading). */
  leadingIcon?: ReactNode;
}

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-lg font-medium " +
  "select-none whitespace-nowrap transition-[transform,opacity,background-color,border-color] " +
  "duration-150 ease-out active:scale-[0.98] active:duration-75 active:ease-in " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "motion-reduce:transition-none motion-reduce:active:scale-100";

const variants: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-600 " +
    "disabled:hover:bg-indigo-600",
  secondary:
    "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 " +
    "focus-visible:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 " +
    "dark:text-neutral-100 dark:hover:bg-neutral-800",
  ghost:
    "text-neutral-700 hover:bg-neutral-100 focus-visible:ring-neutral-500 " +
    "dark:text-neutral-200 dark:hover:bg-neutral-800",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 " +
    "disabled:hover:bg-red-600",
};

// md is 44px (h-11) to satisfy the ≥44px touch target as the default.
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-[52px] px-6 text-base",
};

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin motion-reduce:animate-none"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    leadingIcon,
    type = "button",
    disabled,
    className,
    children,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {/* Label stays in the DOM (fixed width) but is hidden from view while loading. */}
      <span className={cx("inline-flex items-center gap-2", loading && "invisible")}>
        {leadingIcon}
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
    </button>
  );
});
