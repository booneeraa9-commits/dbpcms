import type { JSX, ReactNode } from "react";
import { Loader2, Inbox, AlertCircle } from "lucide-react";

/**
 * A reusable table with built-in loading / empty / error states — the three
 * UX states every data view must handle. Feature pages configure columns and
 * pass their data; pagination is controlled by the parent.
 */
export interface Column<T> {
  header: string;
  /** How to render this cell for a row. */
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  isError,
  emptyMessage = "No records found.",
  onRetry,
}: DataTableProps<T>): JSX.Element {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className={"px-4 py-3 font-medium " + (col.className ?? "")}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
                <p className="mt-2 text-slate-500">Loading…</p>
              </td>
            </tr>
          )}

          {!isLoading && isError && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <AlertCircle className="mx-auto h-6 w-6 text-red-500" />
                <p className="mt-2 text-slate-700">Something went wrong.</p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-2 text-sm font-medium text-brand-600 hover:underline"
                  >
                    Retry
                  </button>
                )}
              </td>
            </tr>
          )}

          {!isLoading && !isError && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <Inbox className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-2 text-slate-500">{emptyMessage}</p>
              </td>
            </tr>
          )}

          {!isLoading &&
            !isError &&
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                {columns.map((col) => (
                  <td key={col.header} className={"px-4 py-3 " + (col.className ?? "")}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
