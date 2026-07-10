import * as React from "react";

/**
 * EmptyState — three-part empty state: visual → headline → explanation → one CTA.
 *
 * Variants:
 *  - first-use : encouraging headline + create CTA.
 *  - no-results: echoes the query + a "Clear search" action.
 *  - error     : neutral message + retry; announced via role="status".
 *
 * SaglitzDesign: exactly one primary action, >=44px CTA, visible focus,
 * only transform/opacity animate (ease-out enter).
 */

type BaseProps = {
  icon?: React.ReactNode; // decorative; wrapped with aria-hidden
  headline: string;
  description: string;
  className?: string;
};

function Shell({
  icon,
  headline,
  description,
  children,
  live,
  className = "",
}: BaseProps & { children: React.ReactNode; live?: boolean }) {
  const headingId = React.useId();
  return (
    <div
      // labelled region so assistive tech can navigate to it; error uses role=status
      role={live ? "status" : "region"}
      aria-labelledby={headingId}
      className={[
        "mx-auto flex max-w-md flex-col items-center px-6 py-12 text-center",
        "motion-safe:animate-[fadeIn_200ms_ease-out]",
        className,
      ].join(" ")}
    >
      {icon && (
        <div aria-hidden="true" className="mb-4 text-neutral-400 dark:text-neutral-500">
          {icon}
        </div>
      )}
      <h2 id={headingId} className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        {headline}
      </h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
      <div className="mt-6">{children}</div>
      {/* keyframes; motion-reduce users skip the animation via motion-safe above */}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

const primaryBtn =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white " +
  "hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 " +
  "focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-neutral-950 " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

const secondaryBtn =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-neutral-700 " +
  "hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 " +
  "dark:text-neutral-200 dark:hover:bg-neutral-800";

/* --- first-use ------------------------------------------------------------ */

export function EmptyStateFirstUse({
  icon,
  headline = "Create your first project",
  description = "Projects keep your work organized. Start with one and invite your team later.",
  ctaLabel = "New project",
  onCreate,
}: Partial<BaseProps> & { ctaLabel?: string; onCreate: () => void }) {
  return (
    <Shell icon={icon} headline={headline} description={description}>
      <button type="button" className={primaryBtn} onClick={onCreate}>
        {ctaLabel}
      </button>
    </Shell>
  );
}

/* --- no-results ----------------------------------------------------------- */

export function EmptyStateNoResults({
  icon,
  query,
  onClear,
}: Partial<BaseProps> & { query: string; onClear: () => void }) {
  return (
    <Shell
      icon={icon}
      headline="No matches found"
      // query is user-controlled: rendered as text, never dangerouslySetInnerHTML
      description={`We couldn't find anything for "${query}". Try a different term.`}
    >
      <button type="button" className={secondaryBtn} onClick={onClear}>
        Clear search
      </button>
    </Shell>
  );
}

/* --- error ---------------------------------------------------------------- */

export function EmptyStateError({
  icon,
  description = "Something went wrong loading this. Check your connection and try again.",
  onRetry,
  loading = false,
}: Partial<BaseProps> & { onRetry: () => void; loading?: boolean }) {
  return (
    <Shell icon={icon} headline="Couldn't load this" description={description} live>
      <button type="button" className={primaryBtn} onClick={onRetry} aria-busy={loading} disabled={loading}>
        {loading ? "Retrying…" : "Try again"}
      </button>
    </Shell>
  );
}

/* -------------------------------------------------------------------------- */
/* Usage                                                                      */
/* -------------------------------------------------------------------------- */

const FolderIcon = (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

export function EmptyStateExamples() {
  return (
    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
      <EmptyStateFirstUse icon={FolderIcon} onCreate={() => {}} />
      <EmptyStateNoResults icon={FolderIcon} query="quarterly report" onClear={() => {}} />
      <EmptyStateError icon={FolderIcon} onRetry={() => {}} />
    </div>
  );
}
