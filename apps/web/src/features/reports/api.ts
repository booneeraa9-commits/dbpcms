import { api, getAccessToken } from "@/lib/api-client";

export interface ReportColumn {
  header: string;
  key: string;
}
export interface ReportData {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  generatedAt?: string;
  institution?: string;
}

export const reportsApi = {
  /** Fetch a report as JSON to preview on screen. */
  view: (reportKey: string, filters: Record<string, string> = {}) => {
    const q = new URLSearchParams(filters);
    return api.get<ReportData>(`/reports/hr/${reportKey}?${q.toString()}`);
  },
};

/** Trigger a browser download of an exported report. */
export async function downloadReport(
  reportKey: string,
  format: "pdf" | "excel" | "csv",
  filters: Record<string, string> = {},
): Promise<void> {
  const q = new URLSearchParams({ ...filters, format });
  const res = await fetch(`/api/v1/reports/hr/${reportKey}?${q.toString()}`, {
    headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Export failed.");
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const nameMatch = /filename="([^"]+)"/.exec(disposition);
  const filename = nameMatch?.[1] ?? `${reportKey}.${format === "excel" ? "xlsx" : format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
