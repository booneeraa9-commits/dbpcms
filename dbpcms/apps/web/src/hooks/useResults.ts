import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@dbpcms/shared';

export type ResultStatus = 'DRAFT' | 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'PENDING_AUTHORIZATION' | 'PUBLISHED';
export type AssessmentType = 'EXAM' | 'ASSIGNMENT' | 'PRACTICAL' | 'PROJECT';
export type CompetencyLevel = 'COMPETENT' | 'NOT_YET_COMPETENT';

export interface Result {
  id: string;
  studentId: string;
  studentName?: string;
  studentIdNumber?: string;
  semesterId: string;
  semesterName?: string;
  courseId: string;
  courseName?: string;
  courseCode?: string;
  assessmentType: AssessmentType;
  marksObtained: number;
  marksTotal: number;
  percentage: number;
  grade: string;
  isPass: boolean;
  competencyLevel: CompetencyLevel | null;
  remarks: string | null;
  status: ResultStatus;
  enteredByName?: string;
  enteredAt: string | null;
  verifiedByName?: string;
  verifiedAt: string | null;
  approvedByName?: string;
  approvedAt: string | null;
  authorizedByName?: string;
  authorizedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResultListParams {
  page?: number;
  pageSize?: number;
  studentId?: string;
  semesterId?: string;
  courseId?: string;
  status?: ResultStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error('Request failed');
  return res.data;
}

export function useResults(params: ResultListParams = {}) {
  return useQuery({
    queryKey: ['results', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
      });
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Result>>>(`/results?${search.toString()}`);
      return unwrap(res.data);
    },
  });
}

export function useResult(id: string | undefined) {
  return useQuery({
    queryKey: ['result', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Result>>(`/results/${id}`);
      return unwrap(res.data);
    },
  });
}

export function useCreateResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await apiClient.post<ApiResponse<Result>>('/results', input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['results'] }),
  });
}

export function useBulkCreateResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (results: Record<string, unknown>[]) => {
      const res = await apiClient.post<ApiResponse<{ created: number; failed: any[] }>>(
        '/results/bulk',
        { results },
      );
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['results'] }),
  });
}

export function useUpdateResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Record<string, unknown>) => {
      const res = await apiClient.patch<ApiResponse<Result>>(`/results/${id}`, input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['results'] }),
  });
}

export function useDeleteResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/results/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['results'] }),
  });
}

export function useWorkflowAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'verify' | 'approve' | 'authorize' | 'publish' | 'reject'; reason?: string }) => {
      const res = await apiClient.post<ApiResponse<Result>>(`/results/${id}/${action}`, { action, reason });
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['results'] }),
  });
}

export function useTranscript(studentId: string | undefined) {
  return useQuery({
    queryKey: ['transcript', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<any>>(`/results/transcript/${studentId}`);
      return unwrap(res.data);
    },
  });
}
