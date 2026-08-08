import type { JSX } from "react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ZodSchema } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api-client";
import { subrecordsApi, type SubPath, type SubRecord } from "./subrecords-api";

/**
 * A reusable "list + add/edit/delete" section for any employee sub-record type.
 * Feature tabs describe their fields and validation; this component handles all
 * the CRUD, table rendering, modal form, and the three UX states.
 */
export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "date" | "number" | "textarea" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export function SubRecordSection({
  employeeId,
  path,
  title,
  addLabel,
  schema,
  fields,
  columns,
}: {
  employeeId: string;
  path: SubPath;
  title: string;
  addLabel: string;
  schema: ZodSchema;
  fields: FieldDef[];
  columns: Column<SubRecord>[];
}): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("employee:update");

  const queryKey = ["subrecords", employeeId, path];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => subrecordsApi.list(employeeId, path),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubRecord | null>(null);
  const [deleting, setDeleting] = useState<SubRecord | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function openCreate(): void {
    setEditing(null);
    setValues({});
    setErrors({});
    setFormOpen(true);
  }
  function openEdit(record: SubRecord): void {
    setEditing(record);
    const v: Record<string, string> = {};
    for (const f of fields) {
      const raw = record[f.name];
      if (raw === null || raw === undefined) v[f.name] = "";
      else if (f.type === "date" && typeof raw === "string") v[f.name] = raw.slice(0, 10);
      else v[f.name] = String(raw);
    }
    setValues(v);
    setErrors({});
    setFormOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(values);
      if (!parsed.success) {
        const e: Record<string, string> = {};
        for (const i of parsed.error.issues) e[String(i.path[0])] = i.message;
        setErrors(e);
        throw new Error("validation");
      }
      return editing
        ? subrecordsApi.update(employeeId, path, editing.id, values)
        : subrecordsApi.create(employeeId, path, values);
    },
    onSuccess: () => {
      toast.success(editing ? "Updated." : "Added.");
      setFormOpen(false);
      void qc.invalidateQueries({ queryKey });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) setErrors({ form: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subrecordsApi.remove(employeeId, path, id),
    onSuccess: () => {
      toast.success("Removed.");
      setDeleting(null);
      void qc.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => { toast.error(err.message); setDeleting(null); },
  });

  const actionColumn: Column<SubRecord> = {
    header: "",
    className: "text-right",
    cell: (r) =>
      canManage ? (
        <div className="flex justify-end gap-1">
          <button type="button" onClick={() => openEdit(r)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setDeleting(r)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600" aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null,
  };

  function submit(e: FormEvent): void {
    e.preventDefault();
    setErrors({});
    saveMutation.mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900">{title}</h3>
        {canManage && (
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> {addLabel}</Button>
        )}
      </div>

      <DataTable
        columns={[...columns, actionColumn]}
        rows={data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        isError={isError}
        emptyMessage={`No ${title.toLowerCase()} recorded yet.`}
        onRetry={() => void refetch()}
      />

      <Modal open={formOpen} title={editing ? `Edit — ${title}` : addLabel} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const val = values[f.name] ?? "";
              const set = (value: string) => setValues((c) => ({ ...c, [f.name]: value }));
              if (f.type === "select") {
                return (
                  <div key={f.name}>
                    <label htmlFor={f.name} className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
                    <select id={f.name} value={val} onChange={(e) => set(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100">
                      <option value="">Select…</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {errors[f.name] && <p className="mt-1 text-xs text-red-600">{errors[f.name]}</p>}
                  </div>
                );
              }
              if (f.type === "textarea") {
                return (
                  <div key={f.name} className="sm:col-span-2">
                    <label htmlFor={f.name} className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
                    <textarea id={f.name} value={val} onChange={(e) => set(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                    {errors[f.name] && <p className="mt-1 text-xs text-red-600">{errors[f.name]}</p>}
                  </div>
                );
              }
              return (
                <Input key={f.name} id={f.name} label={f.label} type={f.type ?? "text"} value={val} onChange={(e) => set(e.target.value)} error={errors[f.name]} placeholder={f.placeholder} />
              );
            })}
          </div>
          {errors.form && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editing ? "Save changes" : "Add"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={`Remove entry`}
        message="Are you sure you want to remove this entry?"
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}
