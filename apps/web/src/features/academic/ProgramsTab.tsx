import type { JSX } from "react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Search } from "lucide-react";
import { programCreateSchema } from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api-client";
import {
  programsApi,
  departmentOptionsApi,
  type Program,
} from "./api";

const PAGE_SIZE = 10;

export function ProgramsTab(): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("program:manage");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [deleting, setDeleting] = useState<Program | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["programs", page, search],
    queryFn: () =>
      programsApi.list({ page, pageSize: PAGE_SIZE, search: search || undefined }),
  });

  const { data: departments } = useQuery({
    queryKey: ["department-options"],
    queryFn: () => departmentOptionsApi.list(),
  });

  // form fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("Degree");
  const [durationYears, setDurationYears] = useState(4);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function openCreate(): void {
    setEditing(null);
    setName("");
    setCode("");
    setDepartmentId("");
    setDegreeLevel("Degree");
    setDurationYears(4);
    setErrors({});
    setFormOpen(true);
  }
  function openEdit(p: Program): void {
    setEditing(p);
    setName(p.name);
    setCode(p.code);
    setDepartmentId(p.departmentId);
    setDegreeLevel(p.degreeLevel);
    setDurationYears(p.durationYears);
    setErrors({});
    setFormOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name, code, departmentId, degreeLevel, durationYears, isActive: true };
      const parsed = programCreateSchema.safeParse(payload);
      if (!parsed.success) {
        const e: Record<string, string> = {};
        for (const i of parsed.error.issues) e[String(i.path[0])] = i.message;
        setErrors(e);
        throw new Error("validation");
      }
      return editing
        ? programsApi.update(editing.id, payload)
        : programsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Program updated." : "Program created.");
      setFormOpen(false);
      void qc.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) setErrors({ form: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => programsApi.remove(id),
    onSuccess: () => {
      toast.success("Program deleted.");
      setDeleting(null);
      void qc.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDeleting(null);
    },
  });

  const columns: Column<Program>[] = [
    { header: "Name", cell: (p) => <span className="font-medium text-slate-900">{p.name}</span> },
    { header: "Code", cell: (p) => <span className="font-mono text-slate-600">{p.code}</span> },
    { header: "Department", cell: (p) => p.department?.name ?? "—" },
    { header: "Level", cell: (p) => p.degreeLevel },
    { header: "Years", cell: (p) => p.durationYears },
    {
      header: "",
      className: "text-right",
      cell: (p) =>
        canManage ? (
          <div className="flex justify-end gap-1">
            <button type="button" onClick={() => openEdit(p)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" aria-label="Edit">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setDeleting(p)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600" aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  function submit(e: FormEvent): void {
    e.preventDefault();
    setErrors({});
    saveMutation.mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
          className="relative max-w-sm flex-1"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search programs…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </form>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New program
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="No programs yet. Create your first one."
        onRetry={() => void refetch()}
      />
      {data && data.totalItems > 0 && (
        <Pagination page={data.page} pageSize={data.pageSize} totalItems={data.totalItems} onPageChange={setPage} />
      )}

      <Modal open={formOpen} title={editing ? "Edit program" : "New program"} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Input id="p-name" label="Program name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. Software Engineering" />
          <Input id="p-code" label="Code" value={code} onChange={(e) => setCode(e.target.value)} error={errors.code} placeholder="e.g. SWE" />
          <div>
            <label htmlFor="p-dept" className="mb-1 block text-sm font-medium text-slate-700">Department</label>
            <select
              id="p-dept"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Select a department…</option>
              {departments?.items.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
            {errors.departmentId && <p className="mt-1 text-xs text-red-600">{errors.departmentId}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="p-level" label="Degree level" value={degreeLevel} onChange={(e) => setDegreeLevel(e.target.value)} error={errors.degreeLevel} placeholder="Degree / Diploma" />
            <Input id="p-years" label="Duration (years)" type="number" min={1} max={10} value={durationYears} onChange={(e) => setDurationYears(Number(e.target.value))} error={errors.durationYears} />
          </div>
          {errors.form && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editing ? "Save changes" : "Create program"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete program"
        message={`Delete "${deleting?.name}"? This can be undone by an administrator.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}
