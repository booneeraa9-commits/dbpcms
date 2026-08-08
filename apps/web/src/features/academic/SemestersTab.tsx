import type { JSX } from "react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { semesterCreateSchema } from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api-client";
import { semestersApi, academicYearsApi, type Semester } from "./api";

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  closed: "bg-amber-100 text-amber-700",
};

export function SemestersTab(): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("semester:manage");

  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Semester | null>(null);
  const [filterYear, setFilterYear] = useState("");

  const [academicYearId, setAcademicYearId] = useState("");
  const [name, setName] = useState("");
  const [sequence, setSequence] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"planned" | "active" | "closed">("planned");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: years } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearsApi.list({ page: 1, pageSize: 50 }),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["semesters", filterYear],
    queryFn: () =>
      semestersApi.list({ page: 1, pageSize: 50, academicYear: filterYear || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = { academicYearId, name, sequence, startDate, endDate, status };
      const parsed = semesterCreateSchema.safeParse(payload);
      if (!parsed.success) {
        const e: Record<string, string> = {};
        for (const i of parsed.error.issues) e[String(i.path[0])] = i.message;
        setErrors(e);
        throw new Error("validation");
      }
      return semestersApi.create(payload);
    },
    onSuccess: () => {
      toast.success("Semester created.");
      setFormOpen(false);
      void qc.invalidateQueries({ queryKey: ["semesters"] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) setErrors({ form: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => semestersApi.remove(id),
    onSuccess: () => {
      toast.success("Semester deleted.");
      setDeleting(null);
      void qc.invalidateQueries({ queryKey: ["semesters"] });
    },
    onError: (err: Error) => { toast.error(err.message); setDeleting(null); },
  });

  const columns: Column<Semester>[] = [
    { header: "Name", cell: (s) => <span className="font-medium text-slate-900">{s.name}</span> },
    { header: "Academic year", cell: (s) => s.academicYear?.name ?? "—" },
    { header: "Seq", cell: (s) => s.sequence },
    {
      header: "Status",
      cell: (s) => (
        <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (STATUS_COLORS[s.status] ?? "bg-slate-100")}>
          {s.status}
        </span>
      ),
    },
    {
      header: "",
      className: "text-right",
      cell: (s) =>
        canManage ? (
          <button type="button" onClick={() => setDeleting(s)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600" aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null,
    },
  ];

  function openCreate(): void {
    setAcademicYearId(filterYear || "");
    setName(""); setSequence(1); setStartDate(""); setEndDate(""); setStatus("planned");
    setErrors({});
    setFormOpen(true);
  }
  function submit(e: FormEvent): void {
    e.preventDefault();
    setErrors({});
    createMutation.mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label htmlFor="filter-year" className="sr-only">Filter by academic year</label>
          <select
            id="filter-year"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">All academic years</option>
            {years?.items.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>
        {canManage && (
          <Button onClick={openCreate} disabled={!years || years.items.length === 0}>
            <Plus className="h-4 w-4" /> New semester
          </Button>
        )}
      </div>

      {years && years.items.length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Create an academic year first, then you can add semesters to it.
        </p>
      )}

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(s) => s.id}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="No semesters yet."
        onRetry={() => void refetch()}
      />

      <Modal open={formOpen} title="New semester" onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label htmlFor="s-year" className="mb-1 block text-sm font-medium text-slate-700">Academic year</label>
            <select
              id="s-year"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Select an academic year…</option>
              {years?.items.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
            {errors.academicYearId && <p className="mt-1 text-xs text-red-600">{errors.academicYearId}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="s-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. Semester I" />
            <Input id="s-seq" label="Sequence" type="number" min={1} max={6} value={sequence} onChange={(e) => setSequence(Number(e.target.value))} error={errors.sequence} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="s-start" label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} error={errors.startDate} />
            <Input id="s-end" label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} error={errors.endDate} />
          </div>
          <div>
            <label htmlFor="s-status" className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              id="s-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "planned" | "active" | "closed")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          {errors.form && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete semester"
        message={`Delete "${deleting?.name}"?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}
