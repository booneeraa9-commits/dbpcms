/**
 * Activity log (audit trail) hooks.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@dbpcms/shared';

export interface ActivityEntry {
  id: string;
  userId: string | null;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  description: string | null;
  ipAddress: string | null;
  metadata: any;
  createdAt: string;
}

export interface ActivityStats {
  since: string;
  total: number;
  byAction: { action: string; count: number }[];
  topUsers: { userId: string; user: { firstName: string; lastName: string; email: string } | null; count: number }[];
}

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error('Request failed');
  return res.data;
}

export function useActivity(params: { page?: number; pageSize?: number; action?: string; resource?: string } = {}) {
  return useQuery({
    queryKey: ['activity', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
      });
      const res = await apiClient.get<ApiResponse<{ items: ActivityEntry[]; meta: any }>>(
        `/activity?${search.toString()}`,
      );
      return unwrap(res.data);
    },
  });
}

export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ['activity', 'recent', limit],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ActivityEntry[]>>(`/activity/recent?limit=${limit}`);
      return unwrap(res.data);
    },
    refetchInterval: 60_000,
  });
}

export function useActivityStats() {
  return useQuery({
    queryKey: ['activity', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ActivityStats>>('/activity/stats');
      return unwrap(res.data);
    },
  });
}
