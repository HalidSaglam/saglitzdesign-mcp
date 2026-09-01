import { FormEvent, useId, useState } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const fieldClass =
  "h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base text-neutral-900 " +
  "placeholder:text-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-neutral-700 dark:bg-neutral-900 " +
  "dark:text-neutral-100 dark:focus-visible:ring-offset-neutral-950";

export function SignupForm({ onSubmit }: { onSubmit?: (data: FormData) => void }) {
  const emailId = useId();
  const companyId = useId();
  const passwordId = useId();
  const updatesId = useId();
  const [error, setError] = useState("Password must be at least 8 characters.");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    onSubmit?.(data);
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-6" aria-labelledby="signup-title">
      <h1 id="signup-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
        Create account
      </h1>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={emailId} className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Work email <span className="font-normal text-neutral-500"> (required)</span>
        </label>
        <input id={emailId} name="email" type="email" autoComplete="email" required placeholder="you@company.com" className={fieldClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={companyId} className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Company <span className="font-normal text-neutral-500"> (optional)</span>
        </label>
        <input id={companyId} name="organization" type="text" autoComplete="organization" className={fieldClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={passwordId} className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Password <span className="font-normal text-neutral-500"> (required)</span>
        </label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${passwordId}-desc` : undefined}
          className={cx(fieldClass, error && "border-red-500 focus-visible:ring-red-500")}
        />
        {error && (
          <p id={`${passwordId}-desc`} role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      <label htmlFor={updatesId} className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
        <input id={updatesId} name="updates" type="checkbox" className="mt-1 h-4 w-4 accent-indigo-600" />
        Email me product updates. You can unsubscribe any time.
      </label>

      <button
        type="submit"
        className="h-11 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
      >
        Create account
      </button>
    </form>
  );
}
