import { api, getAccessToken } from "@/lib/api-client";

export interface TranscriptRow {
  code: string; title: string; creditHours: number;
  letter: string | null; gradePoint: number | null; isPass: boolean | null; percentage: number | null;
}
export interface TranscriptSemester {
  semesterName: string; academicYear: string;
  rows: TranscriptRow[]; semesterGpa: number; semesterCredits: number;
}
export interface Transcript {
  student: { id: string; studentNumber: string; name: string; department: string; program: string; degreeLevel: string; status: string };
  semesters: TranscriptSemester[];
  cumulativeGpa: number; creditsAttempted: number; creditsEarned: number; hasResults: boolean;
}

export const transcriptsApi = {
  get: (studentId: string) => api.get<Transcript>(`/transcripts/students/${studentId}`),
  /** Opens the printable transcript HTML (with QR) in a new tab. */
  openPrint: async (studentId: string): Promise<boolean> => {
    const res = await fetch(`/api/v1/transcripts/students/${studentId}/print`, {
      headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
      credentials: "include",
    });
    if (!res.ok) return false;
    const html = await res.text();
    const win = window.open("", "_blank");
    if (win) { win.document.open(); win.document.write(html); win.document.close(); }
    return true;
  },
};
