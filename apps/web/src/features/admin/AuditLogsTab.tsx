import type { JSX } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { auditLogsApi, type AuditLog } from "./api";

const PAGE_SIZE = 15;

export function AuditLogsTab(): JSX.Element {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [actionInput, setActionInput] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit-logs", page, action],
    queryFn: () =>
      auditLogsApi.list({ page, pageSize: PAGE_SIZE, action: action || undefined }),
  });

  const columns: Column<AuditLog>[] = [
    {
      header: "When",
      cell: (l) => (
        <span className="whitespace-nowrap text-slate-600">
          {new Date(l.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Who",
      cell: (l) => (l.user ? l.user.fullName : "System"),
    },
    {
      header: "Action",
      cell: (l) => (
        <span className="font-mono text-xs text-slate-700">{l.action}</span>
      ),
    },
    {
      header: "Entity",
      cell: (l) =>
        l.entityType ? (
          <span className="text-slate-600">
            {l.entityType}
            {l.entityId ? (
              <span className="text-slate-400"> · {l.entityId.slice(0, 8)}…</span>
            ) : null}
          </span>
        ) : (
          "—"
        ),
    },
    { header: "IP", cell: (l) => l.ipAddress ?? "—" },
  ];

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setAction(actionInput.trim());
        }}
        className="max-w-sm"
      >
        <input
          type="search"
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
          placeholder="Filter by action (e.g. user.create)…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </form>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(l) => l.id}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="No audit entries found."
        onRetry={() => void refetch()}
      />
      {data && data.totalItems > 0 && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          totalItems={data.totalItems}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
