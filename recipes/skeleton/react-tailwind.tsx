export function InvoiceSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading invoices"
      className="flex max-w-md flex-col gap-3"
    >
      <div aria-hidden className="h-4 w-2/5 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
      <div aria-hidden className="h-11 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
      <div aria-hidden className="h-11 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
      <div aria-hidden className="h-4 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
      <div aria-hidden className="h-4 w-3/5 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
    </div>
  );
}
