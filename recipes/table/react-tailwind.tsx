import * as React from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export type TableRow = { id: string; name: string; status: string; amount: string };

export function DataTable({
  caption,
  rows,
  selectedId,
  onSelect,
}: {
  caption: string;
  rows: TableRow[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <table className="w-full border-collapse text-left text-sm text-neutral-900 dark:text-neutral-100">
      <caption className="mb-3 text-left text-sm font-semibold">{caption}</caption>
      <thead>
        <tr className="border-b border-neutral-200 dark:border-neutral-800">
          <th scope="col" className="px-3 py-2 font-medium text-neutral-500 dark:text-neutral-400">
            Invoice
          </th>
          <th scope="col" className="px-3 py-2 font-medium text-neutral-500 dark:text-neutral-400">
            Status
          </th>
          <th scope="col" className="px-3 py-2 text-right font-medium text-neutral-500 dark:text-neutral-400">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={3} className="px-3 py-6 text-neutral-500">
              No invoices yet.
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const selected = row.id === selectedId;
            return (
              <tr
                key={row.id}
                aria-selected={selected}
                onClick={() => onSelect?.(row.id)}
                className={cx(
                  "border-b border-neutral-100 dark:border-neutral-800",
                  selected && "bg-indigo-600/10",
                  onSelect && "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800",
                )}
              >
                <th scope="row" className="px-3 py-3 font-medium">
                  {selected && (
                    <span aria-hidden="true" className="mr-2 inline-block h-4 w-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  )}
                  {row.name}
                </th>
                <td className="px-3 py-3 text-neutral-600 dark:text-neutral-300">{row.status}</td>
                <td className="px-3 py-3 text-right tabular-nums">{row.amount}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
