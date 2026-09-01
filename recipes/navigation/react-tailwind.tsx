import * as React from "react";

/**
 * Navigation — compact tab bar and dashboard sidebar.
 * Active state is a 2px bar (shape) plus a filled weight, not colour alone.
 * House palette: indigo + neutral.
 */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  current?: boolean;
};

export function TabBar({ items, "aria-label": ariaLabel }: { items: NavItem[]; "aria-label": string }) {
  return (
    <nav aria-label={ariaLabel} className="flex border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={cx(
            "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs",
            item.current
              ? "font-semibold text-indigo-600 dark:text-indigo-400"
              : "font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
          )}
        >
          <span aria-hidden="true" className="grid h-6 w-6 place-items-center">
            {item.icon}
          </span>
          {item.label}
          <span
            aria-hidden="true"
            className={cx("h-0.5 w-6 rounded-full", item.current ? "bg-indigo-600 dark:bg-indigo-400" : "bg-transparent")}
          />
        </a>
      ))}
    </nav>
  );
}

export function Sidebar({ items, "aria-label": ariaLabel }: { items: NavItem[]; "aria-label": string }) {
  return (
    <nav aria-label={ariaLabel} className="flex w-56 flex-col gap-1 border-r border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={cx(
            "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm",
            item.current
              ? "bg-indigo-600/10 font-semibold text-indigo-600 dark:text-indigo-400"
              : "font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
          )}
        >
          {item.current && (
            <span aria-hidden="true" className="h-5 w-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
          )}
          <span aria-hidden="true" className="grid h-6 w-6 place-items-center">
            {item.icon}
          </span>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
