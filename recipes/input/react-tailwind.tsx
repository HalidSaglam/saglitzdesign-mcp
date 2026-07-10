import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Guidance shown under the field when there is no error. */
  helperText?: ReactNode;
  /** When set, the field renders its error state and announces this message. */
  error?: string;
  /** Controls the "(required)"/"(optional)" hint next to the label. */
  requiredHint?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    helperText,
    error,
    required,
    requiredHint = true,
    id,
    className,
    disabled,
    // text-base = 16px, so iOS Safari won't zoom the viewport on focus.
    type = "text",
    ...rest
  },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describeId = `${inputId}-desc`;
  const hasError = Boolean(error);
  const message = error ?? helperText;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {label}
        {requiredHint && (
          <span className="ml-1 font-normal text-neutral-500 dark:text-neutral-400">
            {required ? "(required)" : "(optional)"}
          </span>
        )}
      </label>

      <input
        ref={ref}
        id={inputId}
        type={type}
        required={required}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={message ? describeId : undefined}
        className={cx(
          "h-11 w-full rounded-lg border bg-white px-3 text-base text-neutral-900 " +
            "placeholder:text-neutral-400 transition-colors duration-150 ease-out " +
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
            "focus-visible:ring-offset-white dark:bg-neutral-900 dark:text-neutral-100 " +
            "dark:focus-visible:ring-offset-neutral-950 " +
            "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 " +
            "motion-reduce:transition-none",
          hasError
            ? "border-red-500 focus-visible:ring-red-500"
            : "border-neutral-300 focus-visible:border-indigo-600 focus-visible:ring-indigo-600 dark:border-neutral-700",
          className
        )}
        {...rest}
      />

      {message && (
        <p
          id={describeId}
          // role=alert makes the error announce immediately when it appears.
          role={hasError ? "alert" : undefined}
          className={cx(
            "text-sm",
            hasError ? "text-red-600 dark:text-red-400" : "text-neutral-500 dark:text-neutral-400"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
});

/* Usage:
<Input
  label="Work email"
  type="email"
  autoComplete="email"
  required
  error={touched && !valid ? "Enter a valid email address." : undefined}
  helperText="We'll only use this to send receipts."
/>
*/
