import type { JSX } from "react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { courseCreateSchema } from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api-client";
import { coursesApi, type Course } from "./courses-sections-api";
import { departmentOptionsApi } from "./api";

const PAGE_SIZE = 10;

export function CoursesTab(): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("course:manage");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["courses", page, search],
    queryFn: () => coursesApi.list({ page, pageSize: PAGE_SIZE, search: search || undefined }),
  });
  const { data: programs } = useQuery({ queryKey: ["programs-for-courses"], queryFn: () => departmentOptionsApi.list() });

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [creditHours, setCreditHours] = useState(3);
  const [category, setCategory] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function openCreate() { setEditing(null); setCode(""); setTitle(""); setCreditHours(3); setCategory(""); setErrors({}); setFormOpen(true); }
  function openEdit(c: Course) { setEditing(c); setCode(c.code); setTitle(c.title); setCreditHours(c.creditHours); setCategory(c.category ?? ""); setErrors({}); setFormOpen(true); }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { code, title, creditHours, category, isActive: true };
      const parsed = courseCreateSchema.safeParse(payload);
      if (!parsed.success) { const e: Record<string, string> = {}; for (const i of parsed.error.issues) e[String(i.path[0])] = i.message; setErrors(e); throw new Error("v"); }
      return editing ? coursesApi.update(editing.id, payload) : coursesApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? "Course updated." : "Course created."); setFormOpen(false); void qc.invalidateQueries({ queryKey: ["courses"] }); },
    onError: (err: unknown) => { if (err instanceof ApiError) setErrors({ form: err.message }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => coursesApi.remove(id),
    onSuccess: () => { toast.success("Course deleted."); setDeleting(null); void qc.invalidateQueries({ queryKey: ["courses"] }); },
    onError: (e: Error) => { toast.error(e.message); setDeleting(null); },
  });

  void programs;
  const columns: Column<Course>[] = [
    { header: "Code", cell: (c) => <span className="font-mono text-slate-700 dark:text-slate-200">{c.code}</span> },
    { header: "Title", cell: (c) => <span className="font-medium text-slate-900 dark:text-slate-100">{c.title}</span> },
    { header: "Credits", cell: (c) => c.creditHours },
    { header: "Category", cell: (c) => c.category ?? "—" },
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
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search courses…" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
        </form>
        {canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> New course</Button>}
      </div>
      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(c) => c.id} isLoading={isLoading} isError={isError} emptyMessage="No courses yet." onRetry={() => void refetch()} />
      {data && data.totalItems > 0 && <Pagination page={data.page} pageSize={data.pageSize} totalItems={data.totalItems} onPageChange={setPage} />}

      <Modal open={formOpen} title={editing ? "Edit course" : "New course"} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Input id="c-code" label="Code" value={code} onChange={(e) => setCode(e.target.value)} error={errors.code} placeholder="e.g. SWE201" />
          <Input id="c-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="c-credits" label="Credit hours" type="number" min={0} max={20} value={creditHours} onChange={(e) => setCreditHours(Number(e.target.value))} error={errors.creditHours} />
            <Input id="c-cat" label="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Core / Elective" />
          </div>
          {errors.form && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{editing ? "Save changes" : "Create"}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={deleting !== null} title="Delete course" message={`Delete "${deleting?.title}"? Courses with sections can't be deleted.`} confirmLabel="Delete" loading={del.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && del.mutate(deleting.id)} />
    </div>
  );
}
