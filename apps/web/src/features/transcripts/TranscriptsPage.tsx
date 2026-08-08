import type { JSX } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Printer, Loader2, FileText, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/DataTable";
import { useToast } from "@/components/toast/ToastProvider";
import { studentsApi, optionsApi, type Student } from "@/features/students/api";
import { sectionsApi } from "@/features/academic/courses-sections-api";
import { semestersApi, academicYearsApi } from "@/features/academic/api";
import { transcriptsApi, type Transcript } from "./api";

type Mode = "search" | "browse";

/**
 * Transcripts: find a student either by SEARCH or by BROWSING
 * (Department → Program, or Section enrollment), then view + print the official
 * transcript (semester + cumulative GPA, QR verification, photo box).
 */
export function TranscriptsPage(): JSX.Element {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("search");
  const [selected, setSelected] = useState<Student | null>(null);
  const [printing, setPrinting] = useState(false);

  const { data: transcript, isLoading: tLoading } = useQuery({
    queryKey: ["transcript", selected?.id],
    queryFn: () => transcriptsApi.get(selected!.id),
    enabled: selected !== null,
  });

  async function print(): Promise<void> {
    if (!selected) return;
    setPrinting(true);
    const ok = await transcriptsApi.openPrint(selected.id);
    if (!ok) toast.error("Could not generate the transcript.");
    setPrinting(false);
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400">&larr; Back</button>
        <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{selected.firstName} {selected.lastName}</h1>
            <p className="text-sm text-slate-500">{selected.studentNumber} · {selected.program?.name}</p>
          </div>
          <Button onClick={print} loading={printing}><Printer className="h-4 w-4" /> Print transcript</Button>
        </div>
        {tLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>}
        {transcript && <TranscriptView t={transcript} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Transcripts</h1>
        <p className="text-sm text-slate-500">Find a student by searching or browsing, then view and print their transcript.</p>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex gap-1">
          {([["search", "Search", Search], ["browse", "Browse", ListFilter]] as [Mode, string, typeof Search][]).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setMode(id)}
              className={cn("flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium", mode === id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </div>

      {mode === "search" ? <SearchMode onPick={setSelected} /> : <BrowseMode onPick={setSelected} />}
    </div>
  );
}

/** Search by name / student number. */
function SearchMode({ onPick }: { onPick: (s: Student) => void }): JSX.Element {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["transcript-search", search],
    queryFn: () => studentsApi.list({ page: 1, pageSize: 20, search: search || undefined }),
    enabled: search.length > 0,
  });
  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }} className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search name or student ID…" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
      </form>
      {search.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500">Type a name or student ID to begin.</div>
      ) : (
        <StudentPickTable rows={data?.items ?? []} isLoading={isLoading} isError={isError} onRetry={() => void refetch()} onPick={onPick} />
      )}
    </div>
  );
}

/** Browse by Department + Program, or by Section (enrolled students). */
function BrowseMode({ onPick }: { onPick: (s: Student) => void }): JSX.Element {
  const [by, setBy] = useState<"program" | "section">("program");

  // Program browse filters
  const [departmentId, setDepartmentId] = useState("");
  const [programId, setProgramId] = useState("");
  const { data: depts } = useQuery({ queryKey: ["t-depts"], queryFn: () => optionsApi.departments() });
  const { data: programs } = useQuery({ queryKey: ["t-programs"], queryFn: () => optionsApi.programs() });

  const { data: byProgram, isLoading: pLoading, isError: pError, refetch: pRefetch } = useQuery({
    queryKey: ["t-students-by", departmentId, programId],
    queryFn: () => studentsApi.list({ page: 1, pageSize: 100, department: departmentId || undefined, program: programId || undefined }),
    enabled: by === "program" && (departmentId !== "" || programId !== ""),
  });

  // Section browse filters
  const [semYear, setSemYear] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const { data: years } = useQuery({ queryKey: ["t-years"], queryFn: () => academicYearsApi.list({ page: 1, pageSize: 50 }) });
  const { data: semesters } = useQuery({ queryKey: ["t-sems", semYear], queryFn: () => semestersApi.list({ page: 1, pageSize: 50, academicYear: semYear || undefined }) });
  const { data: sections } = useQuery({ queryKey: ["t-sections", semesterId], queryFn: () => sectionsApi.list({ page: 1, pageSize: 100, semester: semesterId || undefined }), enabled: semesterId !== "" });
  const { data: enrollments, isLoading: eLoading, isError: eError, refetch: eRefetch } = useQuery({
    queryKey: ["t-enrollments", sectionId],
    queryFn: () => sectionsApi.enrollments(sectionId),
    enabled: by === "section" && sectionId !== "",
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([["program", "By Department / Program"], ["section", "By Section"]] as [typeof by, string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setBy(id)}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", by === id ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600 dark:border-slate-700")}>{label}</button>
        ))}
      </div>

      {by === "program" ? (
        <>
          <div className="flex flex-wrap gap-3">
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">All departments</option>
              {depts?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={programId} onChange={(e) => setProgramId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">All programs</option>
              {programs?.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {departmentId === "" && programId === "" ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500">Pick a department or program to list its students.</div>
          ) : (
            <StudentPickTable rows={byProgram?.items ?? []} isLoading={pLoading} isError={pError} onRetry={() => void pRefetch()} onPick={onPick} />
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <select value={semYear} onChange={(e) => { setSemYear(e.target.value); setSemesterId(""); setSectionId(""); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">Academic year…</option>
              {years?.items.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
            <select value={semesterId} onChange={(e) => { setSemesterId(e.target.value); setSectionId(""); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">Semester…</option>
              {semesters?.items.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.academicYear?.name})</option>)}
            </select>
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!semesterId} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800">
              <option value="">Section…</option>
              {sections?.items.map((s) => <option key={s.id} value={s.id}>{s.course?.code} — Section {s.sectionLabel}</option>)}
            </select>
          </div>
          {sectionId === "" ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500">Pick a section to list its enrolled students.</div>
          ) : eLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
          ) : eError ? (
            <p className="text-sm text-red-600">Could not load. <button className="underline" onClick={() => void eRefetch()}>Retry</button></p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {(enrollments ?? []).length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">No students enrolled in this section.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(enrollments ?? []).map((e) => (
                    <li key={e.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{e.student.firstName} {e.student.lastName}</p>
                        <p className="font-mono text-xs text-slate-500">{e.student.studentNumber}</p>
                      </div>
                      <button type="button" onClick={() => onPick({ id: e.student.id, firstName: e.student.firstName, lastName: e.student.lastName, studentNumber: e.student.studentNumber } as Student)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50"><FileText className="h-4 w-4" /> View transcript</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StudentPickTable({ rows, isLoading, isError, onRetry, onPick }: {
  rows: Student[]; isLoading?: boolean; isError?: boolean; onRetry?: () => void; onPick: (s: Student) => void;
}): JSX.Element {
  const columns: Column<Student>[] = [
    { header: "Student", cell: (s) => <div><p className="font-medium text-slate-900 dark:text-slate-100">{s.firstName} {s.lastName}</p><p className="font-mono text-xs text-slate-500">{s.studentNumber}</p></div> },
    { header: "Program", cell: (s) => s.program?.name ?? "—" },
    { header: "Department", cell: (s) => s.department?.name ?? "—" },
    { header: "", className: "text-right", cell: (s) => <button type="button" onClick={() => onPick(s)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50"><FileText className="h-4 w-4" /> View transcript</button> },
  ];
  return <DataTable columns={columns} rows={rows} rowKey={(s) => s.id} isLoading={isLoading} isError={isError} emptyMessage="No students found." onRetry={onRetry} />;
}

function TranscriptView({ t }: { t: Transcript }): JSX.Element {
  return (
    <div className="space-y-4">
      {!t.hasResults && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">No published results yet for this student.</div>}
      {t.semesters.map((sem, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="border-l-4 border-brand-600 bg-slate-50 px-4 py-2 text-sm font-semibold dark:bg-slate-800/50">{sem.semesterName} · {sem.academicYear}</div>
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="px-4 py-2 font-medium">Code</th><th className="px-4 py-2 font-medium">Course</th><th className="px-4 py-2 text-center font-medium">Cr</th><th className="px-4 py-2 text-center font-medium">Grade</th><th className="px-4 py-2 text-center font-medium">Pt</th><th className="px-4 py-2 text-center font-medium">Result</th></tr></thead>
            <tbody>
              {sem.rows.map((r, j) => (
                <tr key={j} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2 font-mono">{r.code}</td><td className="px-4 py-2">{r.title}</td>
                  <td className="px-4 py-2 text-center">{r.creditHours}</td>
                  <td className="px-4 py-2 text-center font-semibold">{r.letter ?? "—"}</td>
                  <td className="px-4 py-2 text-center">{r.gradePoint ?? "—"}</td>
                  <td className={"px-4 py-2 text-center " + (r.isPass === false ? "text-red-600" : r.isPass ? "text-emerald-600" : "")}>{r.isPass === null ? "—" : r.isPass ? "Pass" : "Fail"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 text-right text-sm text-slate-600 dark:text-slate-300">Semester GPA: <strong>{sem.semesterGpa.toFixed(2)}</strong></div>
        </div>
      ))}
      <div className="grid grid-cols-3 gap-4 rounded-xl bg-brand-50 p-4 dark:bg-brand-500/10">
        <div className="text-center"><p className="text-2xl font-bold text-brand-700 dark:text-brand-200">{t.cumulativeGpa.toFixed(2)}</p><p className="text-xs uppercase text-slate-500">Cumulative GPA</p></div>
        <div className="text-center"><p className="text-2xl font-bold text-brand-700 dark:text-brand-200">{t.creditsAttempted}</p><p className="text-xs uppercase text-slate-500">Credits attempted</p></div>
        <div className="text-center"><p className="text-2xl font-bold text-brand-700 dark:text-brand-200">{t.creditsEarned}</p><p className="text-xs uppercase text-slate-500">Credits earned</p></div>
      </div>
    </div>
  );
}
