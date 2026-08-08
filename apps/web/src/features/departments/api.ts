import { api } from "@/lib/api-client";
import type {
  DepartmentCreateInput,
  DepartmentUpdateInput,
} from "@dbpcms/shared";

/** The department record as returned by the API. */
export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentListResult {
  items: Department[];
  page: number;
  pageSize: number;
  totalItems: number;
}

/**
 * The api-client returns the `data` payload directly; list metadata (page,
 * totals) lives in the response envelope's `meta`. We do a raw fetch for the
 * list so we can read meta, and use the api client for single-item calls.
 */
export async function fetchDepartments(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<DepartmentListResult> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.search) query.set("search", params.search);

  const { items, meta } = await api.getList<Department>(
    `/departments?${query.toString()}`,
  );
  return {
    items,
    page: meta.page,
    pageSize: meta.pageSize,
    totalItems: meta.totalItems,
  };
}

export const departmentsApi = {
  create: (input: DepartmentCreateInput) =>
    api.post<Department>("/departments", input),
  update: (id: string, input: DepartmentUpdateInput) =>
    api.patch<Department>(`/departments/${id}`, input),
  remove: (id: string) => api.delete<void>(`/departments/${id}`),
};
