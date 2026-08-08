import { api } from "@/lib/api-client";
import type { StudentCreateInput, StudentUpdateInput } from "@dbpcms/shared";

async function fetchList<T>(path: string, params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, String(v));
  const { items, meta } = await api.getList<T>(`${path}?${q.toString()}`);
  return { items, page: meta.page, pageSize: meta.pageSize, totalItems: meta.totalItems };
}

export interface Student {
  id: string;
  studentNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: string;
  dateOfBirth: string | null;
  email: string | null;
  phoneNumber: string | null;
  departmentId: string;
  programId: string;
  batch: string | null;
  section: string | null;
  status: string;
  department?: { id: string; name: string; code: string };
  program?: { id: string; name: string; code: string };
}

export const studentsApi = {
  list: (p: { page: number; pageSize: number; search?: string; department?: string; program?: string; status?: string }) =>
    fetchList<Student>("/students", p),
  get: (id: string) => api.get<Student>(`/students/${id}`),
  create: (input: StudentCreateInput) => api.post<Student>("/students", input),
  update: (id: string, input: StudentUpdateInput) => api.patch<Student>(`/students/${id}`, input),
  remove: (id: string) => api.delete<void>(`/students/${id}`),
};

export interface Option { id: string; name: string; code: string }
export const optionsApi = {
  departments: () => fetchList<Option>("/departments", { page: 1, pageSize: 100 }),
  programs: () => fetchList<Option>("/programs", { page: 1, pageSize: 100 }),
};
