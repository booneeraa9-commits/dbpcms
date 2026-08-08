import { api } from "@/lib/api-client";
import type {
  ProgramCreateInput,
  ProgramUpdateInput,
  AcademicYearCreateInput,
  SemesterCreateInput,
} from "@dbpcms/shared";

/** Shared list-fetch helper that returns items + pagination meta. */
async function fetchList<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<{ items: T[]; page: number; pageSize: number; totalItems: number }> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") query.set(k, String(v));
  }
  const { items, meta } = await api.getList<T>(`${path}?${query.toString()}`);
  return {
    items,
    page: meta.page,
    pageSize: meta.pageSize,
    totalItems: meta.totalItems,
  };
}

// ---- Programs -------------------------------------------------------------
export interface Program {
  id: string;
  name: string;
  code: string;
  degreeLevel: string;
  durationYears: number;
  isActive: boolean;
  departmentId: string;
  department?: { id: string; name: string; code: string };
}

export const programsApi = {
  list: (params: { page: number; pageSize: number; search?: string; department?: string }) =>
    fetchList<Program>("/programs", params),
  create: (input: ProgramCreateInput) => api.post<Program>("/programs", input),
  update: (id: string, input: ProgramUpdateInput) =>
    api.patch<Program>(`/programs/${id}`, input),
  remove: (id: string) => api.delete<void>(`/programs/${id}`),
};

// ---- Departments (for dropdowns) -----------------------------------------
export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}
export const departmentOptionsApi = {
  list: () => fetchList<DepartmentOption>("/departments", { page: 1, pageSize: 100 }),
};

// ---- Academic years -------------------------------------------------------
export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}
export const academicYearsApi = {
  list: (params: { page: number; pageSize: number; search?: string }) =>
    fetchList<AcademicYear>("/academic-years", params),
  create: (input: AcademicYearCreateInput) =>
    api.post<AcademicYear>("/academic-years", input),
  setCurrent: (id: string) =>
    api.post<AcademicYear>(`/academic-years/${id}/set-current`),
  remove: (id: string) => api.delete<void>(`/academic-years/${id}`),
};

// ---- Semesters ------------------------------------------------------------
export interface Semester {
  id: string;
  name: string;
  sequence: number;
  startDate: string;
  endDate: string;
  status: string;
  academicYearId: string;
  academicYear?: { id: string; name: string };
}
export const semestersApi = {
  list: (params: { page: number; pageSize: number; academicYear?: string }) =>
    fetchList<Semester>("/semesters", params),
  create: (input: SemesterCreateInput) => api.post<Semester>("/semesters", input),
  remove: (id: string) => api.delete<void>(`/semesters/${id}`),
};
