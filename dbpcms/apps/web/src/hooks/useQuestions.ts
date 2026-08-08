/**
 * Question bank hooks.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@dbpcms/shared';

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MATCHING' | 'SHORT_ANSWER' | 'ESSAY' | 'PRACTICAL';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type BloomsLevel = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
export type QuestionStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PENDING_APPROVAL' | 'ACTIVE' | 'RETIRED' | 'REJECTED';

export interface Question {
  id: string;
  courseId: string;
  courseName?: string;
  courseCode?: string;
  type: QuestionType;
  difficulty: Difficulty;
  bloomsLevel: BloomsLevel;
  marks: number;
  content: Record<string, any>;
  keywords: string[];
  attachments: any[] | null;
  status: QuestionStatus;
  rejectionReason: string | null;
  timesUsed: number;
  lastUsedAt: string | null;
  version: number;
  parentId: string | null;
  createdById: string;
  createdByName?: string;
  reviewedById: string | null;
  reviewedByName?: string;
  approvedById: string | null;
  approvedByName?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { examQuestions: number };
}

export interface QuestionListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  courseId?: string;
  type?: QuestionType;
  difficulty?: Difficulty;
  bloomsLevel?: BloomsLevel;
  status?: QuestionStatus;
  createdById?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error('Request failed');
  return res.data;
}

export function useQuestions(params: QuestionListParams = {}) {
  return useQuery({
    queryKey: ['questions', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
      });
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Question>>>(`/questions?${search.toString()}`);
      return unwrap(res.data);
    },
  });
}

export function useQuestion(id: string | undefined) {
  return useQuery({
    queryKey: ['question', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Question>>(`/questions/${id}`);
      return unwrap(res.data);
    },
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await apiClient.post<ApiResponse<Question>>('/questions', input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Record<string, unknown>) => {
      const res = await apiClient.patch<ApiResponse<Question>>(`/questions/${id}`, input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/questions/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
}

export function useSubmitForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<ApiResponse<Question>>(`/questions/${id}/submit`, {});
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
}

export function useReviewQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'approve' | 'reject' | 'request_changes'; reason?: string }) => {
      const res = await apiClient.post<ApiResponse<Question>>(`/questions/${id}/review`, { action, reason });
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
}

export function useApproveQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<ApiResponse<Question>>(`/questions/${id}/approve`, {});
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
}
