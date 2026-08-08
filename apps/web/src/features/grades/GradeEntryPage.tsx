import type { JSX } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ChevronRight } from "lucide-react";
import { sectionsApi } from "@/features/academic/courses-sections-api";
import { academicYearsApi, semestersApi } from "@/features/academic/api";
import { DataTable, type Column } from "@/components/DataTable";
import { GradesheetGrid } from "./GradesheetGrid";
import type { Section } from "@/features/academic/courses-sections-api";

/**
 * Grade Entry: pick a semester, choose a section, and open its gradesheet grid.
 * The backend enforces who may actually enter marks for each section.
 */
export function GradeEntryPage(): JSX.Element {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [semYear, setSemYear] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");

  const { data: years } = useQuery({ queryKey: ["ay-grade-entry"], queryFn: () => academicYearsApi.list({ page: 1, pageSize: 50 }) });
  const { data: semesters } = useQuery({ queryKey: ["sem-grade-entry", semYear], queryFn: () => semestersApi.list({ page: 1, pageSize: 50, academicYear: semYear || undefined }) });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sections-grade-entry", semesterFilter],
    queryFn: () => sectionsApi.list({ page: 1, pageSize: 100, semester: semesterFilter || undefined }),
  });

  if (openSection) {
    return <GradesheetGrid sectionId={openSection} onBack={() => setOpenSection(null)} />;
  }

  const columns: Column<Section>[] = [
    { header: "Course", cell: (s) => <div><p className="font-medium text-slate-900 dark:text-slate-100">{s.course?.code} — {s.course?.title}</p><p className="text-xs text-slate-500">Section {s.sectionLabel} · {s.semester?.name}</p></div> },
    { header: "Instructors", cell: (s) => s.instructors.length ? s.instructors.map((i) => i.instructor.fullName).join(", ") : <span className="text-slate-400">None</span> },
    { header: "Enrolled", cell: (s) => s._count?.enrollments ?? 0 },
    { header: "", className: "text-right", cell: (s) => (
      <button type="button" onClick={() => setOpenSection(s.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50">
        <ClipboardList className="h-4 w-4" /> Enter grades <ChevronRight className="h-4 w-4" />
      </button>) },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Grade Entry</h1>
        <p className="text-sm text-slate-500">Choose a section to enter or edit its grades.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={semYear} onChange={(e) => setSemYear(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">All years</option>
          {years?.items.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">All semesters</option>
          {semesters?.items.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.academicYear?.name})</option>)}
        </select>
      </div>

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(s) => s.id} isLoading={isLoading} isError={isError} emptyMessage="No sections found. Create sections under Academic → Sections." onRetry={() => void refetch()} />
    </div>
  );
}
