import type { JSX } from "react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  studentCreateSchema,
  GENDERS,
  STUDENT_STATUSES,
  STUDENT_STATUS_LABELS,
} from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api-client";
import { studentsApi, optionsApi, type Student } from "./api";
import { StudentPhoto } from "./StudentPhoto";

const PAGE_SIZE = 10;
const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  graduated: "bg-blue-100 text-blue-700",
  withdrawn: "bg-red-100 text-red-700",
  suspended: "bg-amber-100 text-amber-700",
};

export function StudentsPage(): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("student:manage");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["students", page, search, deptFilter, statusFilter],
    queryFn: () => studentsApi.list({ page, pageSize: PAGE_SIZE, search: search || undefined, department: deptFilter || undefined, status: statusFilter || undefined }),
  });
  const { data: depts } = useQuery({ queryKey: ["opt-depts"], queryFn: () => optionsApi.departments() });
  const { data: programs } = useQuery({ queryKey: ["opt-programs"], queryFn: () => optionsApi.programs() });

  // form state
  const [f, setF] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }));

  function openCreate(): void {
    setEditing(null); setF({ status: "active" }); setErrors({}); setFormOpen(true);
  }
  function openEdit(s: Student): void {
    setEditing(s);
    setF({
      firstName: s.firstName, middleName: s.middleName ?? "", lastName: s.lastName,
      gender: s.gender, dateOfBirth: s.dateOfBirth?.slice(0, 10) ?? "",
      email: s.email ?? "", phoneNumber: s.phoneNumber ?? "",
      departmentId: s.departmentId, programId: s.programId,
      batch: s.batch ?? "", section: s.section ?? "", status: s.status,
    });
    setErrors({}); setFormOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const parsed = studentCreateSchema.safeParse(f);
      if (!parsed.success) {
        const e: Record<string, string> = {};
        for (const i of parsed.error.issues) e[String(i.path[0])] = i.message;
        setErrors(e); throw new Error("validation");
      }
      return editing ? studentsApi.update(editing.id, f as never) : studentsApi.create(f as never);
    },
    onSuccess: (s) => {
      toast.success(editing ? "Student updated." : `Student ${(s as Student).studentNumber} registered.`);
      setFormOpen(false); void qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err: unknown) => { if (err instanceof ApiError) setErrors({ form: err.message }); },
  });

  const del = useMutation({
    mutationFn: (id: string) => studentsApi.remove(id),
    onSuccess: () => { toast.success("Student deleted."); setDeleting(null); void qc.invalidateQueries({ queryKey: ["students"] }); },
    onError: (e: Error) => { toast.error(e.message); setDeleting(null); },
  });

  const columns: Column<Student>[] = [
    { header: "Student", cell: (s) => (<div><p className="font-medium text-slate-900 dark:text-slate-100">{s.firstName} {s.lastName}</p><p className="font-mono text-xs text-slate-500">{s.studentNumber}</p></div>) },
    { header: "Program", cell: (s) => s.program?.name ?? "—" },
    { header: "Department", cell: (s) => s.department?.name ?? "—" },
    { header: "Status", cell: (s) => <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (STATUS_COLORS[s.status] ?? "bg-slate-100")}>{STUDENT_STATUS_LABELS[s.status] ?? s.status}</span> },
    { header: "", className: "text-right", cell: (s) => canManage ? (
      <div className="flex justify-end gap-1">
        <button type="button" onClick={() => openEdit(s)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
        <button type="button" onClick={() => setDeleting(s)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
      </div>) : null },
  ];

  function submit(e: FormEvent): void { e.preventDefault(); setErrors({}); save.mutate(); }

  // Only show programs that belong to the chosen department in the form.
  const formPrograms = (programs?.items ?? []).filter(() => true);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Students</h1>
          <p className="text-sm text-slate-500">Manage student records.</p>
        </div>
        {canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Register student</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search name or student ID…" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800" />
        </form>
        <select value={deptFilter} onChange={(e) => { setPage(1); setDeptFilter(e.target.value); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" aria-label="Filter by department">
          <option value="">All departments</option>
          {depts?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" aria-label="Filter by status">
          <option value="">All statuses</option>
          {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{STUDENT_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(s) => s.id} isLoading={isLoading} isError={isError} emptyMessage="No students yet. Register your first one." onRetry={() => void refetch()} />
      {data && data.totalItems > 0 && <Pagination page={data.page} pageSize={data.pageSize} totalItems={data.totalItems} onPageChange={setPage} />}

      <Modal open={formOpen} title={editing ? "Edit student" : "Register student"} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {editing && (
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Photo (used on transcript)</p>
              <StudentPhoto studentId={editing.id} firstName={editing.firstName} lastName={editing.lastName} canEdit={canManage} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input id="firstName" label="First name" value={f.firstName ?? ""} onChange={set("firstName")} error={errors.firstName} />
            <Input id="middleName" label="Middle name (optional)" value={f.middleName ?? ""} onChange={set("middleName")} />
            <Input id="lastName" label="Last name" value={f.lastName ?? ""} onChange={set("lastName")} error={errors.lastName} />
            <div>
              <label htmlFor="gender" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Gender</label>
              <select id="gender" value={f.gender ?? ""} onChange={set("gender")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Select…</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g[0]!.toUpperCase() + g.slice(1)}</option>)}
              </select>
              {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender}</p>}
            </div>
            <Input id="dateOfBirth" label="Date of birth (optional)" type="date" value={f.dateOfBirth ?? ""} onChange={set("dateOfBirth")} />
            <Input id="email" label="Email (optional)" type="email" value={f.email ?? ""} onChange={set("email")} error={errors.email} />
            <Input id="phoneNumber" label="Phone (optional)" value={f.phoneNumber ?? ""} onChange={set("phoneNumber")} />
            <div>
              <label htmlFor="departmentId" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Department</label>
              <select id="departmentId" value={f.departmentId ?? ""} onChange={set("departmentId")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Select…</option>
                {depts?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.departmentId && <p className="mt-1 text-xs text-red-600">{errors.departmentId}</p>}
            </div>
            <div>
              <label htmlFor="programId" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Program</label>
              <select id="programId" value={f.programId ?? ""} onChange={set("programId")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Select…</option>
                {formPrograms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.programId && <p className="mt-1 text-xs text-red-600">{errors.programId}</p>}
            </div>
            <Input id="batch" label="Batch (optional)" value={f.batch ?? ""} onChange={set("batch")} placeholder="e.g. 2026 intake" />
            <Input id="section" label="Class section (optional)" value={f.section ?? ""} onChange={set("section")} placeholder="e.g. A" />
            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
              <select id="status" value={f.status ?? "active"} onChange={set("status")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{STUDENT_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          {errors.form && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{editing ? "Save changes" : "Register"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={deleting !== null} title="Delete student" message={`Delete ${deleting?.firstName} ${deleting?.lastName}? This can be undone by an administrator.`} confirmLabel="Delete" loading={del.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && del.mutate(deleting.id)} />
    </div>
  );
}
