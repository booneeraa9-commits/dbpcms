import type { JSX } from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_STATUS_LABELS,
} from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/utils";
import { employeesApi, type EmployeeDetail } from "./api";
import { EmployeeForm, type EmployeeFormValues } from "./EmployeeForm";

type Tab = "personal" | "employment";

function Field({ label, value }: { label: string; value?: string | null }): JSX.Element {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value && value.length > 0 ? value : "—"}</p>
    </div>
  );
}

function fmtDate(d?: string | null): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export function EmployeeProfilePage(): JSX.Element {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("employee:update");
  const canDelete = hasPermission("employee:delete");

  const [tab, setTab] = useState<Tab>("personal");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => employeesApi.get(id),
    enabled: id.length > 0,
  });

  const updateMutation = useMutation({
    mutationFn: (values: EmployeeFormValues) => employeesApi.update(id, values as never),
    onSuccess: () => {
      toast.success("Employee updated.");
      setEditOpen(false);
      void qc.invalidateQueries({ queryKey: ["employee", id] });
      void qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => employeesApi.remove(id),
    onSuccess: () => {
      toast.success("Employee deleted.");
      navigate("/employees", { replace: true });
    },
    onError: (err: Error) => { toast.error(err.message); setConfirmDelete(false); },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => navigate("/employees")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load this employee.
        </p>
      </div>
    );
  }

  const e: EmployeeDetail = data;
  const fullName = [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/employees")}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </button>

      {/* Header */}
      <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
            {e.firstName[0]}{e.lastName[0]}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{fullName}</h1>
            <p className="text-sm text-slate-500">
              {e.position} · {e.department?.name}
            </p>
            <p className="font-mono text-xs text-slate-400">{e.employeeNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canUpdate && (
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {(["personal", "employment"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === "personal" && (
        <div className="grid grid-cols-1 gap-6 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-3">
          <Field label="First name" value={e.firstName} />
          <Field label="Middle name" value={e.middleName} />
          <Field label="Last name" value={e.lastName} />
          <Field label="Gender" value={e.gender} />
          <Field label="Date of birth" value={fmtDate(e.dateOfBirth)} />
          <Field label="Marital status" value={e.maritalStatus} />
          <Field label="Nationality" value={e.nationality} />
          <Field label="National ID" value={e.nationalId} />
          <Field label="Tax ID" value={e.taxId} />
          <Field label="Phone" value={e.phoneNumber} />
          <Field label="Email" value={e.email} />
          <Field label="Address" value={e.address} />
        </div>
      )}

      {tab === "employment" && (
        <div className="grid grid-cols-1 gap-6 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-3">
          <Field label="Department" value={e.department?.name} />
          <Field label="Position" value={e.position} />
          <Field label="Employment type" value={EMPLOYMENT_TYPE_LABELS[e.employmentType]} />
          <Field label="Status" value={EMPLOYMENT_STATUS_LABELS[e.employmentStatus]} />
          <Field label="Date of employment" value={fmtDate(e.dateOfEmployment)} />
          <Field label="Contract type" value={e.contractType} />
          <Field label="Contract end date" value={fmtDate(e.contractEndDate)} />
          <Field label="Salary grade" value={e.salaryGrade} />
          <Field label="Office location" value={e.officeLocation} />
          <Field
            label="Supervisor"
            value={e.supervisor ? `${e.supervisor.firstName} ${e.supervisor.lastName}` : null}
          />
        </div>
      )}

      <Modal open={editOpen} title="Edit employee" onClose={() => setEditOpen(false)}>
        <EmployeeForm
          initial={e}
          submitting={updateMutation.isPending}
          onCancel={() => setEditOpen(false)}
          onSubmit={async (values) => { await updateMutation.mutateAsync(values); }}
        />
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete employee"
        message={`Delete ${fullName}? This can be undone by an administrator.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
