import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Eye } from "lucide-react";
import { EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABELS } from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { employeesApi, departmentOptionsApi, type EmployeeListItem } from "./api";
import { EmployeeForm, type EmployeeFormValues } from "./EmployeeForm";

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  on_leave: "bg-blue-100 text-blue-700",
  suspended: "bg-amber-100 text-amber-700",
  terminated: "bg-red-100 text-red-700",
  retired: "bg-slate-100 text-slate-600",
};

export function EmployeesListPage(): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("employee:create");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["employees", page, search, deptFilter, statusFilter],
    queryFn: () =>
      employeesApi.list({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        department: deptFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  const { data: departments } = useQuery({
    queryKey: ["employee-department-options"],
    queryFn: () => departmentOptionsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (values: EmployeeFormValues) =>
      employeesApi.create(values as never),
    onSuccess: (created) => {
      toast.success(`Employee ${created.employeeNumber} registered.`);
      setFormOpen(false);
      void qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const columns: Column<EmployeeListItem>[] = [
    {
      header: "Employee",
      cell: (e) => (
        <div>
          <p className="font-medium text-slate-900">
            {e.firstName} {e.lastName}
          </p>
          <p className="font-mono text-xs text-slate-500">{e.employeeNumber}</p>
        </div>
      ),
    },
    { header: "Position", cell: (e) => e.position },
    { header: "Department", cell: (e) => e.department?.name ?? "—" },
    {
      header: "Status",
      cell: (e) => (
        <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (STATUS_COLORS[e.employmentStatus] ?? "bg-slate-100")}>
          {EMPLOYMENT_STATUS_LABELS[e.employmentStatus] ?? e.employmentStatus}
        </span>
      ),
    },
    {
      header: "",
      className: "text-right",
      cell: (e) => (
        <button
          type="button"
          onClick={() => navigate(`/employees/${e.id}`)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50"
        >
          <Eye className="h-4 w-4" /> View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500">Manage employee records.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Register employee
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
          className="relative min-w-[240px] flex-1"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, ID, email, position…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </form>
        <select
          value={deptFilter}
          onChange={(e) => { setPage(1); setDeptFilter(e.target.value); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departments?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {EMPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{EMPLOYMENT_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(e) => e.id}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="No employees yet. Register your first one."
        onRetry={() => void refetch()}
      />
      {data && data.totalItems > 0 && (
        <Pagination page={data.page} pageSize={data.pageSize} totalItems={data.totalItems} onPageChange={setPage} />
      )}

      <Modal open={formOpen} title="Register employee" onClose={() => setFormOpen(false)}>
        <EmployeeForm
          submitting={createMutation.isPending}
          onCancel={() => setFormOpen(false)}
          onSubmit={async (values) => { await createMutation.mutateAsync(values); }}
        />
      </Modal>
    </div>
  );
}
