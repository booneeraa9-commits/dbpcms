import { api, getAccessToken } from "@/lib/api-client";

export interface GradeComputed {
  percentage: number;
  letter: string | null;
  gradePoint: number | null;
  isPass: boolean | null;
}
export interface GradesheetRow {
  enrollmentId: string;
  student: { id: string; studentNumber: string; firstName: string; lastName: string };
  scores: Record<string, { score: number }>;
  result: GradeComputed | null;
}
export interface Gradesheet {
  section: {
    id: string;
    sectionLabel: string;
    course: { code: string; title: string; creditHours: number };
    semester: { name: string };
  };
  components: { id: string; name: string; weightPercent: number; maxScore: number }[];
  status: string;
  locked: boolean;
  rows: GradesheetRow[];
}

export interface SaveEntry {
  enrollmentId: string;
  componentId: string;
  score: number;
}

/** PUT helper (the shared api-client exposes get/post/patch/delete). */
async function saveGrades(sectionId: string, entries: SaveEntry[]): Promise<Gradesheet> {
  const res = await fetch(`/api/v1/grades/sections/${sectionId}/grades`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken() ?? ""}`,
    },
    credentials: "include",
    body: JSON.stringify({ entries }),
  });
  const json = (await res.json().catch(() => null)) as
    | { success: boolean; data?: Gradesheet; error?: { message: string } }
    | null;
  if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? "Save failed.");
  return json.data as Gradesheet;
}

export const gradesApi = {
  gradesheet: (sectionId: string) =>
    api.get<Gradesheet>(`/grades/sections/${sectionId}/gradesheet`),
  save: saveGrades,
  submit: (sectionId: string) => api.post(`/grades/sections/${sectionId}/submit`),
  approve: (sectionId: string) => api.post(`/grades/sections/${sectionId}/approve`),
  publish: (sectionId: string) => api.post(`/grades/sections/${sectionId}/publish`),
  returnForCorrection: (sectionId: string, reason: string) =>
    api.post(`/grades/sections/${sectionId}/return`, { reason }),
  unlock: (sectionId: string) => api.post(`/grades/sections/${sectionId}/unlock`),
};
