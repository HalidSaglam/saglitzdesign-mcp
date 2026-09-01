import * as React from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function SearchField({
  value,
  onChange,
  onCancel,
  placeholder = "Search",
  "aria-label": ariaLabel = "Search",
}: {
  value: string;
  onChange: (next: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const id = React.useId();
  return (
    <div className="flex min-h-11 items-center gap-2">
      <div className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-900">
        <span aria-hidden="true" className="text-neutral-400">
          ⌕
        </span>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="min-h-11 w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear"
            className="grid h-11 w-11 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:hover:bg-neutral-800"
          >
            ×
          </button>
        )}
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg px-3 text-sm font-medium text-indigo-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:text-indigo-400"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
