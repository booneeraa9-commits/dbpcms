import type { JSX } from "react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { gradeComponentSchema } from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api-client";
import { gradingConfigApi, type GradeComponent } from "./api";

export function ComponentsEditor(): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("grading:config");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["grade-components"],
    queryFn: () => gradingConfigApi.components(),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GradeComponent | null>(null);
  const [deleting, setDeleting] = useState<GradeComponent | null>(null);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState(10);
  const [maxScore, setMaxScore] = useState(10);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openCreate = () => { setEditing(null); setName(""); setWeight(10); setMaxScore(10); setErrors({}); setOpen(true); };
  const openEdit = (c: GradeComponent) => { setEditing(c); setName(c.name); setWeight(c.weightPercent); setMaxScore(c.maxScore); setErrors({}); setOpen(true); };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name, weightPercent: weight, maxScore, sequence: editing?.sequence ?? (data?.components.length ?? 0) + 1, isActive: true };
      const parsed = gradeComponentSchema.safeParse(payload);
      if (!parsed.success) { const e: Record<string, string> = {}; for (const i of parsed.error.issues) e[String(i.path[0])] = i.message; setErrors(e); throw new Error("v"); }
      return editing ? gradingConfigApi.updateComponent(editing.id, payload) : gradingConfigApi.createComponent(payload);
    },
    onSuccess: () => { toast.success(editing ? "Component updated." : "Component added."); setOpen(false); void qc.invalidateQueries({ queryKey: ["grade-components"] }); },
    onError: (err: unknown) => { if (err instanceof ApiError) setErrors({ form: err.message }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => gradingConfigApi.removeComponent(id),
    onSuccess: () => { toast.success("Component removed."); setDeleting(null); void qc.invalidateQueries({ queryKey: ["grade-components"] }); },
    onError: (e: Error) => { toast.error(e.message); setDeleting(null); },
  });

  const total = data?.weightTotal ?? 0;
  const totalOk = Math.abs(total - 100) < 0.001;

  const columns: Column<GradeComponent>[] = [
    { header: "Component", cell: (c) => <span className="font-medium text-slate-900 dark:text-slate-100">{c.name}</span> },
    { header: "Out of", cell: (c) => c.maxScore },
    { header: "Weight", cell: (c) => `${c.weightPercent}%` },
    { header: "Status", cell: (c) => c.isActive ? <span className="text-emerald-600">Active</span> : <span className="text-slate-400">Inactive</span> },
    { header: "", className: "text-right", cell: (c) => canManage ? (
      <div className="flex justify-end gap-1">
        <button type="button" onClick={() => openEdit(c)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
        <button type="button" onClick={() => setDeleting(c)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
      </div>) : null },
  ];

  function submit(e: FormEvent) { e.preventDefault(); setErrors({}); save.mutate(); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Grade components</h3>
          <p className="text-sm text-slate-500">Define components and their weights. Active weights should total 100%.</p>
        </div>
        {canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add component</Button>}
      </div>

      <div className={"flex items-center gap-2 rounded-lg border px-4 py-2 text-sm " + (totalOk ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
        {totalOk ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        Active weights total: <strong>{total}%</strong>{totalOk ? " — perfect." : " — should be 100% before grading."}
      </div>

      <DataTable columns={columns} rows={data?.components ?? []} rowKey={(c) => c.id} isLoading={isLoading} isError={isError} emptyMessage="No components yet." onRetry={() => void refetch()} />

      <Modal open={open} title={editing ? "Edit component" : "Add component"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Input id="gc-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. Mid Exam" />
          <div className="grid grid-cols-2 gap-3">
            <Input id="gc-max" label="Out of (max score)" type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} error={errors.maxScore} placeholder="e.g. 25" />
            <Input id="gc-weight" label="Weight (%)" type="number" min={0} max={100} value={weight} onChange={(e) => setWeight(Number(e.target.value))} error={errors.weightPercent} />
          </div>
          <p className="text-xs text-slate-500">Instructors enter marks out of the max; the weight is how much it counts toward the final grade.</p>
          {errors.form && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{editing ? "Save" : "Add"}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={deleting !== null} title="Remove component" message={`Remove "${deleting?.name}"?`} confirmLabel="Remove" loading={del.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && del.mutate(deleting.id)} />
    </div>
  );
}
