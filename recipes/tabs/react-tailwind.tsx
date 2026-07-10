import * as React from "react";

/**
 * Tabs — WAI-ARIA tabs pattern with roving tabindex and automatic activation.
 *
 * - Arrow keys move focus AND select; Home/End jump; focus wraps.
 * - Only the selected tab is in the Tab order (roving tabindex).
 * - Active indicator is a 2px bar (shape, not just color).
 *
 * Deep-linking: pass `paramKey` to sync the active tab to `?tab=<value>`.
 * On mount we read it; on change we history.replaceState (no history spam).
 */

export type TabItem = {
  value: string; // URL-safe id
  label: string;
  disabled?: boolean;
  content: React.ReactNode;
};

type TabsProps = {
  items: TabItem[];
  defaultValue?: string;
  /** If set, sync selection to `?<paramKey>=value`. */
  paramKey?: string;
  "aria-label": string;
};

export function Tabs({ items, defaultValue, paramKey, "aria-label": ariaLabel }: TabsProps) {
  const enabled = items.filter((i) => !i.disabled);

  const initial = React.useMemo(() => {
    if (paramKey && typeof window !== "undefined") {
      const fromUrl = new URLSearchParams(window.location.search).get(paramKey);
      if (fromUrl && items.some((i) => i.value === fromUrl && !i.disabled)) return fromUrl;
    }
    return defaultValue ?? enabled[0]?.value;
  }, [defaultValue, paramKey, items, enabled]);

  const [selected, setSelected] = React.useState(initial);
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  function select(value: string, moveFocus = false) {
    setSelected(value);
    if (moveFocus) tabRefs.current[value]?.focus();
    if (paramKey && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set(paramKey, value);
      window.history.replaceState(null, "", url); // deep-link without polluting history
    }
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const idxs = items.map((_, i) => i).filter((i) => !items[i].disabled);
    const pos = idxs.indexOf(index);
    let next: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = idxs[(pos + 1) % idxs.length]; // wrap
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = idxs[(pos - 1 + idxs.length) % idxs.length]; // wrap
        break;
      case "Home":
        next = idxs[0];
        break;
      case "End":
        next = idxs[idxs.length - 1];
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next != null) select(items[next].value, true); // automatic activation
  }

  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="relative flex gap-1 border-b border-neutral-200 dark:border-neutral-800"
      >
        {items.map((item, i) => {
          const isSelected = item.value === selected;
          return (
            <button
              key={item.value}
              ref={(el) => {
                tabRefs.current[item.value] = el;
              }}
              role="tab"
              id={`tab-${item.value}`}
              aria-selected={isSelected}
              aria-controls={`panel-${item.value}`}
              // roving tabindex: only the selected tab is a Tab stop
              tabIndex={isSelected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={[
                "relative -mb-px inline-flex min-h-11 items-center px-4 text-sm font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                "dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-neutral-950 rounded-t-md",
                item.disabled
                  ? "cursor-not-allowed text-neutral-300 dark:text-neutral-700"
                  : isSelected
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
              ].join(" ")}
            >
              {item.label}
              {/* 2px active indicator — shape reinforces selection, not color alone */}
              <span
                aria-hidden="true"
                className={[
                  "absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-opacity duration-150 ease-out motion-reduce:transition-none",
                  isSelected ? "bg-blue-600 opacity-100 dark:bg-blue-400" : "opacity-0",
                ].join(" ")}
              />
            </button>
          );
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`panel-${item.value}`}
          aria-labelledby={`tab-${item.value}`}
          tabIndex={0} // panel is focusable so keyboard users reach its content
          hidden={item.value !== selected}
          className="p-4 text-sm text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-neutral-300"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Usage                                                                      */
/* -------------------------------------------------------------------------- */

export function TabsExample() {
  return (
    <div className="max-w-lg p-6">
      <Tabs
        aria-label="Account settings"
        paramKey="tab"
        items={[
          { value: "profile", label: "Profile", content: <p>Edit your public profile.</p> },
          { value: "billing", label: "Billing", content: <p>Manage your subscription and invoices.</p> },
          { value: "team", label: "Team", content: <p>Invite teammates and set roles.</p> },
          { value: "archived", label: "Archived", disabled: true, content: <p>No archived items.</p> },
        ]}
      />
    </div>
  );
}
