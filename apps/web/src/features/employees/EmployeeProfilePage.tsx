import type { JSX } from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, Loader2, Printer } from "lucide-react";
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  educationSchema,
  qualificationSchema,
  employmentHistorySchema,
  emergencyContactSchema,
  QUALIFICATION_TYPES,
  QUALIFICATION_TYPE_LABELS,
} from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/api-client";
import { employeesApi, type EmployeeDetail } from "./api";
import { EmployeeForm, type EmployeeFormValues } from "./EmployeeForm";
import { SubRecordSection } from "./SubRecordSection";
import type { SubRecord } from "./subrecords-api";
import { DocumentsTab } from "./DocumentsTab";

type Tab =
  | "personal"
  | "employment"
  | "education"
  | "qualifications"
  | "history"
  | "contacts"
  | "documents";

function subDate(v: unknown): string {
  return typeof v === "string" && v.length > 0
    ? new Date(v).toLocaleDateString()
    : "—";
}
function subText(v: unknown): string {
  return typeof v === "string" && v.length > 0 ? v : "—";
}

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
  const canPrint = hasPermission("employee:print");

  function openPrint(): void {
    // Opens the server-rendered A4 profile (with QR) in a new tab; the user then
    // uses the browser's Print / Save-as-PDF.
    const token = getAccessToken();
    // The print endpoint needs auth; fetch it then open as a blob URL.
    void (async () => {
      const res = await fetch(`/api/v1/employees/${id}/print`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Could not generate the printable profile.");
        return;
      }
      const html = await res.text();
      const win = window.open("", "_blank");
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      }
    })();
  }

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
          {canPrint && (
            <Button variant="secondary" onClick={openPrint}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          )}
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
      <div className="overflow-x-auto border-b border-slate-200">
        <nav className="flex gap-1">
          {([
            ["personal", "Personal"],
            ["employment", "Employment"],
            ["education", "Education"],
            ["qualifications", "Qualifications"],
            ["history", "Employment History"],
            ["contacts", "Emergency Contacts"],
            ["documents", "Documents"],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {label}
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

      {tab === "education" && (
        <SubRecordSection
          employeeId={e.id}
          path="education"
          title="Education"
          addLabel="Add education"
          schema={educationSchema}
          fields={[
            { name: "institution", label: "Institution" },
            { name: "qualification", label: "Qualification" },
            { name: "fieldOfStudy", label: "Field of study" },
            { name: "graduationYear", label: "Graduation year", type: "number" },
            { name: "gpa", label: "GPA" },
          ]}
          columns={[
            { header: "Institution", cell: (r: SubRecord) => subText(r.institution) },
            { header: "Qualification", cell: (r: SubRecord) => subText(r.qualification) },
            { header: "Field", cell: (r: SubRecord) => subText(r.fieldOfStudy) },
            { header: "Year", cell: (r: SubRecord) => (r.graduationYear ? String(r.graduationYear) : "—") },
            { header: "GPA", cell: (r: SubRecord) => subText(r.gpa) },
          ]}
        />
      )}

      {tab === "qualifications" && (
        <SubRecordSection
          employeeId={e.id}
          path="qualifications"
          title="Professional Qualifications"
          addLabel="Add qualification"
          schema={qualificationSchema}
          fields={[
            {
              name: "type",
              label: "Type",
              type: "select",
              options: QUALIFICATION_TYPES.map((t) => ({ value: t, label: QUALIFICATION_TYPE_LABELS[t]! })),
            },
            { name: "title", label: "Title" },
            { name: "issuer", label: "Issuer" },
            { name: "issueDate", label: "Issue date", type: "date" },
            { name: "expiryDate", label: "Expiry date", type: "date" },
            { name: "referenceNo", label: "Reference no." },
          ]}
          columns={[
            { header: "Type", cell: (r: SubRecord) => QUALIFICATION_TYPE_LABELS[String(r.type)] ?? subText(r.type) },
            { header: "Title", cell: (r: SubRecord) => subText(r.title) },
            { header: "Issuer", cell: (r: SubRecord) => subText(r.issuer) },
            { header: "Expires", cell: (r: SubRecord) => subDate(r.expiryDate) },
          ]}
        />
      )}

      {tab === "history" && (
        <SubRecordSection
          employeeId={e.id}
          path="employment-history"
          title="Employment History"
          addLabel="Add previous employment"
          schema={employmentHistorySchema}
          fields={[
            { name: "employer", label: "Employer" },
            { name: "position", label: "Position" },
            { name: "startDate", label: "Start date", type: "date" },
            { name: "endDate", label: "End date", type: "date" },
            { name: "responsibilities", label: "Responsibilities", type: "textarea" },
          ]}
          columns={[
            { header: "Employer", cell: (r: SubRecord) => subText(r.employer) },
            { header: "Position", cell: (r: SubRecord) => subText(r.position) },
            { header: "From", cell: (r: SubRecord) => subDate(r.startDate) },
            { header: "To", cell: (r: SubRecord) => subDate(r.endDate) },
          ]}
        />
      )}

      {tab === "contacts" && (
        <SubRecordSection
          employeeId={e.id}
          path="emergency-contacts"
          title="Emergency Contacts"
          addLabel="Add contact"
          schema={emergencyContactSchema}
          fields={[
            { name: "name", label: "Name" },
            { name: "relationship", label: "Relationship" },
            { name: "phoneNumber", label: "Phone number" },
            { name: "address", label: "Address", type: "textarea" },
          ]}
          columns={[
            { header: "Name", cell: (r: SubRecord) => subText(r.name) },
            { header: "Relationship", cell: (r: SubRecord) => subText(r.relationship) },
            { header: "Phone", cell: (r: SubRecord) => subText(r.phoneNumber) },
          ]}
        />
      )}

      {tab === "documents" && <DocumentsTab employeeId={e.id} />}

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
