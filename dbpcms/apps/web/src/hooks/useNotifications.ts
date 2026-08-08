/**
 * Notifications hooks.
 * Backed by /api/v1/notifications in real mode, localStorage in mock mode.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@dbpcms/shared';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: any;
  readAt: string | null;
  createdAt: string;
}

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error('Request failed');
  return res.data;
}

export function useNotifications(params: { unreadOnly?: boolean; pageSize?: number; page?: number } = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params.unreadOnly) search.set('unreadOnly', 'true');
      if (params.pageSize) search.set('pageSize', String(params.pageSize));
      if (params.page) search.set('page', String(params.page));
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Notification>>>(
        `/notifications?${search.toString()}`,
      );
      return unwrap(res.data);
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
      return unwrap(res.data).count;
    },
    refetchInterval: 30_000, // refresh every 30s
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<ApiResponse<Notification>>(`/notifications/${id}/read`, {});
      return unwrap(res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse<{ count: number }>>('/notifications/mark-all-read', {});
      return unwrap(res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
