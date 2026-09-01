function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const item =
  "inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 " +
  "text-sm text-neutral-900 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 " +
  "dark:text-neutral-100 dark:hover:bg-neutral-800";

export function Pagination({
  page,
  pages,
  hrefFor,
}: {
  page: number;
  pages: number;
  hrefFor: (n: number) => string;
}) {
  const numbers = [1, 2, 3, pages].filter((n, i, all) => n >= 1 && n <= pages && all.indexOf(n) === i);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-2">
      {page <= 1 ? (
        <span className={cx(item, "text-neutral-500")} aria-disabled="true">
          Previous
        </span>
      ) : (
        <a className={item} href={hrefFor(page - 1)} aria-label="Previous page">
          Previous
        </a>
      )}
      <ol className="m-0 flex list-none gap-2 p-0">
        {numbers.map((n) => (
          <li key={n}>
            <a
              href={hrefFor(n)}
              aria-current={n === page ? "page" : undefined}
              className={cx(
                item,
                n === page && "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700",
              )}
            >
              {n}
            </a>
          </li>
        ))}
      </ol>
      {page >= pages ? (
        <span className={cx(item, "text-neutral-500")} aria-disabled="true">
          Next
        </span>
      ) : (
        <a className={item} href={hrefFor(page + 1)} aria-label="Next page">
          Next
        </a>
      )}
    </nav>
  );
}
