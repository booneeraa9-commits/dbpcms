import { api } from "@/lib/api-client";
import type {
  UserCreateInput,
  UserUpdateInput,
  AdminResetPasswordInput,
} from "@dbpcms/shared";

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

export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  roles: { id: string; name: string }[];
}

export const usersApi = {
  list: (params: { page: number; pageSize: number; search?: string }) =>
    fetchList<ManagedUser>("/users", params),
  roles: () => api.get<Role[]>("/users/roles"),
  create: (input: UserCreateInput) => api.post<ManagedUser>("/users", input),
  update: (id: string, input: UserUpdateInput) =>
    api.patch<ManagedUser>(`/users/${id}`, input),
  resetPassword: (id: string, input: AdminResetPasswordInput) =>
    api.post<{ reset: boolean }>(`/users/${id}/reset-password`, input),
  remove: (id: string) => api.delete<void>(`/users/${id}`),
};

export interface AuditLog {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string } | null;
}

export const auditLogsApi = {
  list: (params: {
    page: number;
    pageSize: number;
    action?: string;
    entityType?: string;
  }) => fetchList<AuditLog>("/audit-logs", params),
};

/** Friendly role names for display. */
export const ROLE_LABELS: Record<string, string> = {
  system_administrator: "System Administrator",
  hr_officer: "HR Officer",
  dean: "Dean",
  registrar: "Registrar",
  department_head: "Department Head",
  instructor: "Instructor",
  employee: "Employee",
  student: "Student",
};
