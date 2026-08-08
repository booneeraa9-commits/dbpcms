import { api } from "@/lib/api-client";
import type { EmployeeCreateInput, EmployeeUpdateInput } from "@dbpcms/shared";

async function fetchList<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<{ items: T[]; page: number; pageSize: number; totalItems: number }> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") query.set(k, String(v));
  }
  const { items, meta } = await api.getList<T>(`${path}?${query.toString()}`);
  return { items, page: meta.page, pageSize: meta.pageSize, totalItems: meta.totalItems };
}

export interface EmployeeListItem {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  position: string;
  employmentStatus: string;
  email: string;
  phoneNumber: string;
  department?: { id: string; name: string; code: string };
}

export interface EmployeeDetail extends EmployeeListItem {
  middleName: string | null;
  gender: string;
  dateOfBirth: string;
  nationality: string | null;
  maritalStatus: string | null;
  nationalId: string;
  taxId: string | null;
  address: string | null;
  employmentType: string;
  contractType: string | null;
  dateOfEmployment: string;
  contractEndDate: string | null;
  salaryGrade: string | null;
  officeLocation: string | null;
  supervisorId: string | null;
  supervisor?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  } | null;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
}

export const employeesApi = {
  list: (params: {
    page: number;
    pageSize: number;
    search?: string;
    department?: string;
    status?: string;
  }) => fetchList<EmployeeListItem>("/employees", params),
  get: (id: string) => api.get<EmployeeDetail>(`/employees/${id}`),
  create: (input: EmployeeCreateInput) => api.post<EmployeeDetail>("/employees", input),
  update: (id: string, input: EmployeeUpdateInput) =>
    api.patch<EmployeeDetail>(`/employees/${id}`, input),
  remove: (id: string) => api.delete<void>(`/employees/${id}`),
};

// Department options for the dropdown.
export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}
export const departmentOptionsApi = {
  list: () => fetchList<DepartmentOption>("/departments", { page: 1, pageSize: 100 }),
};
