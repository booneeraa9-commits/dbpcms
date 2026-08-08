import type { JSX } from "react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users, UserPlus, X } from "lucide-react";
import { sectionCreateSchema } from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api-client";
import { sectionsApi, coursesApi, type Section } from "./courses-sections-api";
import { studentsApi } from "@/features/students/api";

// semester options
import { academicYearsApi, semestersApi } from "./api";

export function SectionsTab(): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("section:manage");

  const [semesterFilter, setSemesterFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Section | null>(null);
  const [manage, setManage] = useState<Section | null>(null);

  const { data: years } = useQuery({ queryKey: ["ay-for-sections"], queryFn: () => academicYearsApi.list({ page: 1, pageSize: 50 }) });
  const [semYear, setSemYear] = useState("");
  const { data: semesters } = useQuery({ queryKey: ["sem-for-sections", semYear], queryFn: () => semestersApi.list({ page: 1, pageSize: 50, academicYear: semYear || undefined }) });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sections", semesterFilter],
    queryFn: () => sectionsApi.list({ page: 1, pageSize: 100, semester: semesterFilter || undefined }),
  });
  const { data: courses } = useQuery({ queryKey: ["courses-for-sections"], queryFn: () => coursesApi.list({ page: 1, pageSize: 100 }) });

  const [courseId, setCourseId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [label, setLabel] = useState("A");
  const [capacity, setCapacity] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: async () => {
      const payload = { courseId, semesterId, sectionLabel: label, capacity: capacity ? Number(capacity) : undefined };
      const parsed = sectionCreateSchema.safeParse(payload);
      if (!parsed.success) { const e: Record<string, string> = {}; for (const i of parsed.error.issues) e[String(i.path[0])] = i.message; setErrors(e); throw new Error("v"); }
      return sectionsApi.create(payload);
    },
    onSuccess: () => { toast.success("Section created."); setFormOpen(false); void qc.invalidateQueries({ queryKey: ["sections"] }); },
    onError: (err: unknown) => { if (err instanceof ApiError) setErrors({ form: err.message }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => sectionsApi.remove(id),
    onSuccess: () => { toast.success("Section deleted."); setDeleting(null); void qc.invalidateQueries({ queryKey: ["sections"] }); },
    onError: (e: Error) => { toast.error(e.message); setDeleting(null); },
  });

  const columns: Column<Section>[] = [
    { header: "Course", cell: (s) => <div><p className="font-medium text-slate-900 dark:text-slate-100">{s.course?.code} — {s.course?.title}</p><p className="text-xs text-slate-500">Section {s.sectionLabel} · {s.semester?.name}</p></div> },
    { header: "Instructors", cell: (s) => s.instructors.length ? s.instructors.map((i) => i.instructor.fullName).join(", ") : <span className="text-slate-400">None</span> },
    { header: "Enrolled", cell: (s) => s._count?.enrollments ?? 0 },
    { header: "", className: "text-right", cell: (s) => (
      <div className="flex justify-end gap-1">
        <button type="button" onClick={() => setManage(s)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50"><Users className="h-4 w-4" /> Manage</button>
        {canManage && <button type="button" onClick={() => setDeleting(s)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>}
      </div>) },
  ];

  function openCreate() { setCourseId(""); setSemesterId(semesterFilter || ""); setLabel("A"); setCapacity(""); setErrors({}); setFormOpen(true); }
  function submit(e: FormEvent) { e.preventDefault(); setErrors({}); create.mutate(); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" aria-label="Filter by semester">
          <option value="">All semesters</option>
          {semesters?.items.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.academicYear?.name})</option>)}
        </select>
        {canManage && <Button onClick={openCreate} disabled={!courses || courses.items.length === 0}><Plus className="h-4 w-4" /> New section</Button>}
      </div>

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(s) => s.id} isLoading={isLoading} isError={isError} emptyMessage="No sections yet. Create one from a course + semester." onRetry={() => void refetch()} />

      {/* Create section */}
      <Modal open={formOpen} title="New section" onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Course</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">Select…</option>
              {courses?.items.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
            </select>
            {errors.courseId && <p className="mt-1 text-xs text-red-600">{errors.courseId}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Academic year</label>
            <select value={semYear} onChange={(e) => setSemYear(e.target.value)} className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">All years</option>
              {years?.items.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Semester</label>
            <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">Select…</option>
              {semesters?.items.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.academicYear?.name})</option>)}
            </select>
            {errors.semesterId && <p className="mt-1 text-xs text-red-600">{errors.semesterId}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="sec-label" label="Section label" value={label} onChange={(e) => setLabel(e.target.value)} error={errors.sectionLabel} placeholder="A" />
            <Input id="sec-cap" label="Capacity (optional)" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          {errors.form && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      {manage && <ManageSectionModal section={manage} onClose={() => { setManage(null); void qc.invalidateQueries({ queryKey: ["sections"] }); }} canManage={canManage} />}

      <ConfirmDialog open={deleting !== null} title="Delete section" message="Delete this section?" confirmLabel="Delete" loading={del.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && del.mutate(deleting.id)} />
    </div>
  );
}

/** Modal to manage a section's instructors and enrolled students. */
function ManageSectionModal({ section, onClose, canManage }: { section: Section; onClose: () => void; canManage: boolean }): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"instructors" | "students">("instructors");

  const { data: full } = useQuery({ queryKey: ["section", section.id], queryFn: () => sectionsApi.get(section.id), initialData: section });
  const { data: instructors } = useQuery({ queryKey: ["instructors"], queryFn: () => sectionsApi.instructors() });
  const { data: enrollments } = useQuery({ queryKey: ["enrollments", section.id], queryFn: () => sectionsApi.enrollments(section.id) });
  const { data: students } = useQuery({ queryKey: ["students-for-enroll"], queryFn: () => studentsApi.list({ page: 1, pageSize: 100 }) });

  const [instructorId, setInstructorId] = useState("");
  const [studentId, setStudentId] = useState("");

  const refresh = () => { void qc.invalidateQueries({ queryKey: ["section", section.id] }); void qc.invalidateQueries({ queryKey: ["enrollments", section.id] }); };

  const assign = useMutation({ mutationFn: () => sectionsApi.assign(section.id, instructorId), onSuccess: () => { toast.success("Instructor assigned."); setInstructorId(""); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const unassign = useMutation({ mutationFn: (id: string) => sectionsApi.unassign(section.id, id), onSuccess: () => { toast.success("Instructor removed."); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const enroll = useMutation({ mutationFn: () => sectionsApi.enroll(section.id, studentId), onSuccess: () => { toast.success("Student enrolled."); setStudentId(""); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const unenroll = useMutation({ mutationFn: (id: string) => sectionsApi.unenroll(section.id, id), onSuccess: () => { toast.success("Student removed."); refresh(); }, onError: (e: Error) => toast.error(e.message) });

  return (
    <Modal open title={`${full?.course?.code} — Section ${full?.sectionLabel}`} onClose={onClose}>
      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(["instructors", "students"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={"border-b-2 px-4 py-2 text-sm font-medium capitalize " + (tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500")}>{t}</button>
        ))}
      </div>

      {tab === "instructors" && (
        <div className="space-y-3">
          {canManage && (
            <div className="flex gap-2">
              <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Select an instructor…</option>
                {instructors?.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
              </select>
              <Button onClick={() => assign.mutate()} disabled={!instructorId} loading={assign.isPending}><UserPlus className="h-4 w-4" /> Assign</Button>
            </div>
          )}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {(full?.instructors ?? []).map((i) => (
              <li key={i.instructor.id} className="flex items-center justify-between py-2 text-sm">
                <span>{i.instructor.fullName} <span className="text-slate-400">· {i.instructor.email}</span></span>
                {canManage && <button type="button" onClick={() => unassign.mutate(i.instructor.id)} className="text-slate-400 hover:text-red-600"><X className="h-4 w-4" /></button>}
              </li>
            ))}
            {(full?.instructors ?? []).length === 0 && <li className="py-3 text-sm text-slate-400">No instructors assigned.</li>}
          </ul>
        </div>
      )}

      {tab === "students" && (
        <div className="space-y-3">
          {canManage && (
            <div className="flex gap-2">
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Select a student…</option>
                {students?.items.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentNumber})</option>)}
              </select>
              <Button onClick={() => enroll.mutate()} disabled={!studentId} loading={enroll.isPending}><UserPlus className="h-4 w-4" /> Enroll</Button>
            </div>
          )}
          <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {(enrollments ?? []).map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span>{e.student.firstName} {e.student.lastName} <span className="font-mono text-xs text-slate-400">{e.student.studentNumber}</span></span>
                {canManage && <button type="button" onClick={() => unenroll.mutate(e.id)} className="text-slate-400 hover:text-red-600"><X className="h-4 w-4" /></button>}
              </li>
            ))}
            {(enrollments ?? []).length === 0 && <li className="py-3 text-sm text-slate-400">No students enrolled.</li>}
          </ul>
        </div>
      )}
    </Modal>
  );
}
