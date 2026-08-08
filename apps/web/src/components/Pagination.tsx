import type { JSX } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Simple pagination footer used with DataTable. Controlled by the parent.
 */
export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}): JSX.Element {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm text-slate-600">
      <p>
        Showing {from}–{to} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="px-2">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
