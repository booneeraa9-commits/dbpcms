import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { User, PaginatedResponse, ApiResponse } from '@dbpcms/shared';

export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  roleSlug?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RoleOption {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export function useUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') searchParams.set(k, String(v));
      });
      const res = await apiClient.get<ApiResponse<PaginatedResponse<User>>>(`/users?${searchParams.toString()}`);
      if (!res.data.success) throw new Error('Failed to load users');
      return res.data.data;
    },
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ['users', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
      if (!res.data.success) throw new Error('Failed to load user');
      return res.data.data;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const res = await apiClient.post<ApiResponse<User>>('/users', input);
      if (!res.data.success) throw new Error('Failed to create user');
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Record<string, unknown>) => {
      const res = await apiClient.patch<ApiResponse<User>>(`/users/${id}`, input);
      if (!res.data.success) throw new Error('Failed to update user');
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['users', 'roles'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<RoleOption[]>>('/users/roles');
      if (!res.data.success) throw new Error('Failed to load roles');
      return res.data.data;
    },
    staleTime: 60 * 60 * 1000,
  });
}
