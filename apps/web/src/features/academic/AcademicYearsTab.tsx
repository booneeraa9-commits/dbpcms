import type { JSX } from "react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CheckCircle2, Star } from "lucide-react";
import { academicYearCreateSchema } from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api-client";
import { academicYearsApi, type AcademicYear } from "./api";

export function AcademicYearsTab(): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("academic-year:manage");

  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AcademicYear | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearsApi.list({ page: 1, pageSize: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = academicYearCreateSchema.safeParse({ name, startDate, endDate });
      if (!parsed.success) {
        const e: Record<string, string> = {};
        for (const i of parsed.error.issues) e[String(i.path[0])] = i.message;
        setErrors(e);
        throw new Error("validation");
      }
      return academicYearsApi.create({ name, startDate, endDate });
    },
    onSuccess: () => {
      toast.success("Academic year created.");
      setFormOpen(false);
      setName(""); setStartDate(""); setEndDate("");
      void qc.invalidateQueries({ queryKey: ["academic-years"] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) setErrors({ form: err.message });
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: (id: string) => academicYearsApi.setCurrent(id),
    onSuccess: () => {
      toast.success("Current academic year updated.");
      void qc.invalidateQueries({ queryKey: ["academic-years"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => academicYearsApi.remove(id),
    onSuccess: () => {
      toast.success("Academic year deleted.");
      setDeleting(null);
      void qc.invalidateQueries({ queryKey: ["academic-years"] });
    },
    onError: (err: Error) => { toast.error(err.message); setDeleting(null); },
  });

  const columns: Column<AcademicYear>[] = [
    {
      header: "Year",
      cell: (y) => (
        <span className="flex items-center gap-2 font-medium text-slate-900">
          {y.name}
          {y.isCurrent && (
            <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              <Star className="h-3 w-3" /> Current
            </span>
          )}
        </span>
      ),
    },
    { header: "Start", cell: (y) => new Date(y.startDate).toLocaleDateString() },
    { header: "End", cell: (y) => new Date(y.endDate).toLocaleDateString() },
    {
      header: "",
      className: "text-right",
      cell: (y) =>
        canManage ? (
          <div className="flex justify-end gap-2">
            {!y.isCurrent && (
              <button
                type="button"
                onClick={() => setCurrentMutation.mutate(y.id)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Set current
              </button>
            )}
            <button type="button" onClick={() => setDeleting(y)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600" aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  function submit(e: FormEvent): void {
    e.preventDefault();
    setErrors({});
    createMutation.mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && (
          <Button onClick={() => { setErrors({}); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> New academic year
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(y) => y.id}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="No academic years yet. Create your first one."
        onRetry={() => void refetch()}
      />

      <Modal open={formOpen} title="New academic year" onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Input id="ay-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. 2026/2027" />
          <div className="grid grid-cols-2 gap-3">
            <Input id="ay-start" label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} error={errors.startDate} />
            <Input id="ay-end" label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} error={errors.endDate} />
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
        title="Delete academic year"
        message={`Delete "${deleting?.name}"? Academic years with semesters cannot be deleted.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}
