import type { JSX } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Printer, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/DataTable";
import { useToast } from "@/components/toast/ToastProvider";
import { studentsApi, type Student } from "@/features/students/api";
import { transcriptsApi, type Transcript } from "./api";

/**
 * Transcripts: search a student, view their academic transcript (semester +
 * cumulative GPA), and print the official A4 PDF (with QR verification).
 */
export function TranscriptsPage(): JSX.Element {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);
  const [printing, setPrinting] = useState(false);

  const { data: students, isLoading, isError, refetch } = useQuery({
    queryKey: ["transcript-students", search],
    queryFn: () => studentsApi.list({ page: 1, pageSize: 20, search: search || undefined }),
    enabled: search.length > 0,
  });

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

  const columns: Column<Student>[] = [
    { header: "Student", cell: (s) => <div><p className="font-medium text-slate-900 dark:text-slate-100">{s.firstName} {s.lastName}</p><p className="font-mono text-xs text-slate-500">{s.studentNumber}</p></div> },
    { header: "Program", cell: (s) => s.program?.name ?? "—" },
    { header: "", className: "text-right", cell: (s) => <button type="button" onClick={() => setSelected(s)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50"><FileText className="h-4 w-4" /> View transcript</button> },
  ];

  if (selected) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400">&larr; Back to search</button>
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
        <p className="text-sm text-slate-500">Search a student to view and print their official transcript.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }} className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search name or student ID…" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
      </form>
      {search.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500">Type a name or student ID to begin.</div>
      ) : (
        <DataTable columns={columns} rows={students?.items ?? []} rowKey={(s) => s.id} isLoading={isLoading} isError={isError} emptyMessage="No students match." onRetry={() => void refetch()} />
      )}
    </div>
  );
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
