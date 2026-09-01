import * as React from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  disabled?: boolean;
}) {
  const id = React.useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex max-w-sm flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          "min-h-11 rounded-lg border bg-white px-3 text-sm text-neutral-900",
          "dark:bg-neutral-900 dark:text-neutral-100",
          error ? "border-red-600" : "border-neutral-300 dark:border-neutral-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
          disabled && "opacity-50",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
