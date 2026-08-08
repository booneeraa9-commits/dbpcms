import { api } from "@/lib/api-client";

/**
 * API helpers for the four employee sub-record types. Each is a simple CRUD
 * collection nested under an employee.
 */
export type SubPath =
  | "education"
  | "qualifications"
  | "employment-history"
  | "emergency-contacts";

export interface SubRecord {
  id: string;
  [key: string]: unknown;
}

export const subrecordsApi = {
  list: (employeeId: string, path: SubPath) =>
    api.get<SubRecord[]>(`/employees/${employeeId}/${path}`),
  create: (employeeId: string, path: SubPath, body: Record<string, unknown>) =>
    api.post<SubRecord>(`/employees/${employeeId}/${path}`, body),
  update: (
    employeeId: string,
    path: SubPath,
    id: string,
    body: Record<string, unknown>,
  ) => api.patch<SubRecord>(`/employees/${employeeId}/${path}/${id}`, body),
  remove: (employeeId: string, path: SubPath, id: string) =>
    api.delete<void>(`/employees/${employeeId}/${path}/${id}`),
};
