import * as React from "react";

/**
 * Switch — toggle for instant-effect settings.
 *
 * role="switch" + aria-checked on a real <button>. Space toggles natively;
 * Enter is wired explicitly. The visible track is 52x32 but the button carries
 * a >=44x44 hit area via padding. Thumb slides with transform; snaps under
 * prefers-reduced-motion.
 */

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Visible label text; also used as the accessible name. */
  label: string;
  /** Optional helper text below the label. */
  description?: string;
  disabled?: boolean;
  id?: string;
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch({ checked, onCheckedChange, label, description, disabled = false, id }, ref) {
    const autoId = React.useId();
    const switchId = id ?? autoId;
    const descId = description ? `${switchId}-desc` : undefined;

    function toggle() {
      if (!disabled) onCheckedChange(!checked);
    }

    return (
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          {/* Clicking the label toggles the switch (htmlFor -> button id). */}
          <label
            htmlFor={switchId}
            className={[
              "text-sm font-medium",
              disabled ? "text-neutral-400 dark:text-neutral-600" : "text-neutral-900 dark:text-neutral-50",
              disabled ? "cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            {label}
          </label>
          {description && (
            <span id={descId} className="text-xs text-neutral-500 dark:text-neutral-400">
              {description}
            </span>
          )}
        </div>

        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-describedby={descId}
          disabled={disabled}
          onClick={toggle}
          onKeyDown={(e) => {
            // Space is native on <button>; add Enter for switch parity.
            if (e.key === "Enter") {
              e.preventDefault();
              toggle();
            }
          }}
          // grid place-items-center pads the visible track to a >=44px hit area
          className={[
            "group relative grid h-11 w-11 shrink-0 place-items-center rounded-full",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
            "dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-neutral-950",
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          ].join(" ")}
        >
          {/* Track */}
          <span
            aria-hidden="true"
            className={[
              "block h-8 w-[52px] rounded-full transition-colors duration-150 ease-out motion-reduce:transition-none",
              checked
                ? "bg-blue-600 dark:bg-blue-500"
                : "bg-neutral-300 dark:bg-neutral-700",
            ].join(" ")}
          />
          {/* Thumb — only transform animates; snaps under reduced-motion */}
          <span
            aria-hidden="true"
            className={[
              "pointer-events-none absolute h-6 w-6 rounded-full bg-white shadow",
              "left-1.5 transition-transform duration-150 ease-out motion-reduce:transition-none",
              checked ? "translate-x-5" : "translate-x-0",
            ].join(" ")}
          />
        </button>
      </div>
    );
  }
);

/* -------------------------------------------------------------------------- */
/* Usage                                                                      */
/* -------------------------------------------------------------------------- */

export function SwitchExamples() {
  const [email, setEmail] = React.useState(true);
  const [beta, setBeta] = React.useState(false);

  return (
    <div className="flex max-w-sm flex-col gap-6 p-6">
      <Switch
        label="Email notifications"
        description="Get an email when someone mentions you."
        checked={email}
        onCheckedChange={setEmail}
      />
      <Switch
        label="Beta features"
        description="Try features before they are released."
        checked={beta}
        onCheckedChange={setBeta}
      />
      <Switch label="Two-factor auth (locked by admin)" checked disabled onCheckedChange={() => {}} />
    </div>
  );
}
