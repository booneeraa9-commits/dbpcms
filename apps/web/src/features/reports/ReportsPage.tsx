import type { JSX } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { HR_REPORTS } from "@dbpcms/shared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { reportsApi, downloadReport } from "./api";

const ACADEMIC_REPORTS = [
  { key: "pass-rate", label: "Pass Rate" },
  { key: "top-students", label: "Top Students" },
  { key: "department-gpa", label: "Average GPA by Dept" },
  { key: "failure-analysis", label: "Failure Analysis" },
] as const;

type Group = "hr" | "academic";

export function ReportsPage(): JSX.Element {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canHr = hasPermission("report:view");
  const canAcademic = hasPermission("analytics:view");

  const groups: { id: Group; label: string; show: boolean }[] = [
    { id: "hr", label: "HR Reports", show: canHr },
    { id: "academic", label: "Academic Analytics", show: canAcademic },
  ];
  const firstGroup = groups.find((g) => g.show)?.id ?? "hr";
  const [group, setGroup] = useState<Group>(firstGroup);

  const list = group === "hr" ? HR_REPORTS : ACADEMIC_REPORTS;
  const [reportKey, setReportKey] = useState<string>(list[0].key);
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["report", group, reportKey],
    queryFn: () => reportsApi.view(group, reportKey),
  });

  async function handleDownload(format: "pdf" | "excel" | "csv"): Promise<void> {
    setDownloading(format);
    try { await downloadReport(group, reportKey, format); }
    catch { toast.error("Could not export the report."); }
    finally { setDownloading(null); }
  }

  function switchGroup(g: Group): void {
    setGroup(g);
    setReportKey((g === "hr" ? HR_REPORTS : ACADEMIC_REPORTS)[0].key);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Reports</h1>
        <p className="text-sm text-slate-500">View and export institutional reports.</p>
      </div>

      {groups.filter((g) => g.show).length > 1 && (
        <div className="border-b border-slate-200 dark:border-slate-800">
          <nav className="flex gap-1">
            {groups.filter((g) => g.show).map((g) => (
              <button key={g.id} type="button" onClick={() => switchGroup(g.id)}
                className={cn("border-b-2 px-4 py-2 text-sm font-medium", group === g.id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
                {g.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {list.map((r) => (
          <button key={r.key} type="button" onClick={() => setReportKey(r.key)}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", reportKey === r.key ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300")}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">{data?.title ?? "…"}</h2>
        <div className="flex gap-2">
          <Button variant="secondary" loading={downloading === "pdf"} onClick={() => handleDownload("pdf")}><FileText className="h-4 w-4" /> PDF</Button>
          <Button variant="secondary" loading={downloading === "excel"} onClick={() => handleDownload("excel")}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
          <Button variant="secondary" loading={downloading === "csv"} onClick={() => handleDownload("csv")}><FileDown className="h-4 w-4" /> CSV</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-600">Could not load the report. <button className="font-medium underline" onClick={() => void refetch()}>Retry</button></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50">
              <tr>{data?.columns.map((c) => <th key={c.key} className="px-4 py-3 font-medium">{c.header}</th>)}</tr>
            </thead>
            <tbody>
              {(data?.rows.length ?? 0) === 0 ? (
                <tr><td colSpan={data?.columns.length ?? 1} className="px-4 py-12 text-center text-slate-500">No records match this report.</td></tr>
              ) : (
                data?.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                    {data.columns.map((c) => <td key={c.key} className="px-4 py-2.5">{row[c.key] ?? "—"}</td>)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
