import { api } from "@/lib/api-client";
import type { CourseCreateInput, SectionCreateInput } from "@dbpcms/shared";

async function fetchList<T>(path: string, params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, String(v));
  const { items, meta } = await api.getList<T>(`${path}?${q.toString()}`);
  return { items, page: meta.page, pageSize: meta.pageSize, totalItems: meta.totalItems };
}

export interface Course {
  id: string; code: string; title: string; creditHours: number;
  category: string | null; programId: string | null; isActive: boolean;
  program?: { id: string; name: string } | null;
}
export const coursesApi = {
  list: (p: { page: number; pageSize: number; search?: string }) => fetchList<Course>("/courses", p),
  create: (i: CourseCreateInput) => api.post<Course>("/courses", i),
  update: (id: string, i: Partial<CourseCreateInput>) => api.patch<Course>(`/courses/${id}`, i),
  remove: (id: string) => api.delete<void>(`/courses/${id}`),
};

export interface SectionInstructor { instructor: { id: string; fullName: string; email: string } }
export interface Section {
  id: string; sectionLabel: string; capacity: number | null;
  course?: { id: string; code: string; title: string; creditHours: number };
  semester?: { id: string; name: string };
  instructors: SectionInstructor[];
  _count?: { enrollments: number };
}
export interface Enrollment {
  id: string; student: { id: string; studentNumber: string; firstName: string; lastName: string };
}
export const sectionsApi = {
  list: (p: { page: number; pageSize: number; semester?: string }) => fetchList<Section>("/sections", p),
  get: (id: string) => api.get<Section>(`/sections/${id}`),
  create: (i: SectionCreateInput) => api.post<Section>("/sections", i),
  remove: (id: string) => api.delete<void>(`/sections/${id}`),
  instructors: () => api.get<{ id: string; fullName: string; email: string }[]>("/sections/instructors"),
  assign: (id: string, instructorId: string) => api.post<Section>(`/sections/${id}/instructors`, { instructorId }),
  unassign: (id: string, instructorId: string) => api.delete<Section>(`/sections/${id}/instructors/${instructorId}`),
  enrollments: (id: string) => api.get<Enrollment[]>(`/sections/${id}/enrollments`),
  enroll: (id: string, studentId: string) => api.post<Enrollment>(`/sections/${id}/enrollments`, { studentId }),
  unenroll: (id: string, enrollmentId: string) => api.delete<void>(`/sections/${id}/enrollments/${enrollmentId}`),
};
