import * as React from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}) {
  const id = React.useId();
  const [open, setOpen] = React.useState(false);
  const hide = () => setOpen(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span className="relative inline-flex">
      {React.cloneElement(children, {
        "aria-describedby": open ? id : undefined,
        onMouseEnter: () => setOpen(true),
        onMouseLeave: hide,
        onFocus: () => setOpen(true),
        onBlur: hide,
      })}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cx(
            "absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2",
            "rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white",
            "dark:bg-neutral-100 dark:text-neutral-900",
            "motion-safe:animate-[fadeIn_150ms_ease-out]",
          )}
        >
          {label}
          <span
            aria-hidden="true"
            className="absolute top-full left-1/2 -mt-px h-2 w-2 -translate-x-1/2 rotate-45 bg-neutral-900 dark:bg-neutral-100"
          />
        </span>
      )}
    </span>
  );
}

/* Usage:
<Tooltip label="Download CSV">
  <button type="button" aria-label="Download CSV" className="grid h-11 w-11 place-items-center rounded-lg text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">↓</button>
</Tooltip>
*/
