import type { JSX } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import {
  departmentsApi,
  fetchDepartments,
  type Department,
} from "./api";
import { DepartmentForm, type DepartmentFormValues } from "./DepartmentForm";

const PAGE_SIZE = 10;

export function DepartmentsPage(): JSX.Element {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("department:manage");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);

  const queryKey = ["departments", page, search];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      fetchDepartments({ page, pageSize: PAGE_SIZE, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (values: DepartmentFormValues) =>
      departmentsApi.create({ ...values, description: values.description || undefined }),
    onSuccess: () => {
      toast.success("Department created.");
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: DepartmentFormValues) =>
      departmentsApi.update(editing!.id, {
        ...values,
        description: values.description || undefined,
      }),
    onSuccess: () => {
      toast.success("Department updated.");
      setFormOpen(false);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentsApi.remove(id),
    onSuccess: () => {
      toast.success("Department deleted.");
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setDeleting(null);
    },
  });

  const columns: Column<Department>[] = [
    { header: "Name", cell: (d) => <span className="font-medium text-slate-900">{d.name}</span> },
    { header: "Code", cell: (d) => <span className="font-mono text-slate-600">{d.code}</span> },
    {
      header: "Status",
      cell: (d) => (
        <span
          className={
            "rounded-full px-2 py-0.5 text-xs font-medium " +
            (d.isActive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500")
          }
        >
          {d.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "",
      className: "text-right",
      cell: (d) =>
        canManage ? (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => {
                setEditing(d);
                setFormOpen(true);
              }}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
              aria-label={`Edit ${d.name}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleting(d)}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              aria-label={`Delete ${d.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
          <p className="text-sm text-slate-500">
            Manage the college's academic departments.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New department
          </Button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
        className="relative max-w-sm"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or code…"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </form>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(d) => d.id}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="No departments yet. Create your first one."
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

      {/* Create / edit modal */}
      <Modal
        open={formOpen}
        title={editing ? "Edit department" : "New department"}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      >
        <DepartmentForm
          initial={editing}
          submitting={createMutation.isPending || updateMutation.isPending}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={async (values) => {
            if (editing) await updateMutation.mutateAsync(values);
            else await createMutation.mutateAsync(values);
          }}
        />
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete department"
        message={`Are you sure you want to delete "${deleting?.name}"? This can be undone by an administrator.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}
