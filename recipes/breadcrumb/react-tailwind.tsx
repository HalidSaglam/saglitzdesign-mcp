const link =
  "inline-flex min-h-11 items-center px-1 text-sm text-indigo-600 hover:underline " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 " +
  "focus-visible:ring-offset-2 dark:text-indigo-400";

export function Breadcrumb({
  items,
}: {
  items: Array<{ href?: string; label: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2">
              {i > 0 && (
                <span className="text-neutral-500" aria-hidden>
                  /
                </span>
              )}
              {last || !item.href ? (
                <span aria-current="page" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {item.label}
                </span>
              ) : (
                <a className={link} href={item.href}>
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
