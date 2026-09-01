import * as React from "react";

/**
 * List row — settings grammar for the web.
 *
 * Trailing slot is exactly one of: chevron (whole row is a link) OR a control
 * (switch / value). Never both. Leading icon sits in a 28px column so titles
 * align. Rows are ≥44px. House palette: indigo + neutral, never blue.
 */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const rowClass =
  "flex min-h-11 items-center gap-3 px-3 py-2 text-left text-neutral-900 dark:text-neutral-50";

const iconClass =
  "grid h-7 w-7 shrink-0 place-items-center text-indigo-600 dark:text-indigo-400";

export function NavigationRow({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className={cx(
        rowClass,
        "rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
        "dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-neutral-950",
      )}
    >
      <span aria-hidden="true" className={iconClass}>
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{title}</span>
        {subtitle && (
          <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</span>
        )}
      </span>
      <span aria-hidden="true" className="text-neutral-400">
        ›
      </span>
    </a>
  );
}

export function ToggleRow({
  icon,
  title,
  subtitle,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const id = React.useId();
  return (
    <div className={cx(rowClass, disabled && "opacity-50")}>
      <span aria-hidden="true" className={iconClass}>
        {icon}
      </span>
      <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col">
        <span className="truncate text-sm font-medium">{title}</span>
        {subtitle && (
          <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</span>
        )}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cx(
          "relative h-8 w-[52px] shrink-0 rounded-full",
          checked ? "bg-indigo-600" : "bg-neutral-300 dark:bg-neutral-600",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "absolute top-1 left-1 h-6 w-6 rounded-full bg-white transition-transform duration-150 ease-out motion-reduce:transition-none",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

export function ValueRow({
  icon,
  title,
  value,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className={cx(
        rowClass,
        "rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
        "dark:focus-visible:ring-indigo-400",
      )}
    >
      <span aria-hidden="true" className={iconClass}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
      <span className="text-sm text-neutral-500 dark:text-neutral-400">{value}</span>
      <span aria-hidden="true" className="text-neutral-400">
        ›
      </span>
    </a>
  );
}
