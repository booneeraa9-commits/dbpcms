import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@dbpcms/shared';

export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Exam {
  id: string;
  title: string;
  courseId: string;
  courseName?: string;
  courseCode?: string;
  semesterId: string;
  semesterName?: string;
  durationMinutes: number;
  totalMarks: number;
  instructions: string | null;
  difficultyDistribution: Record<string, number> | null;
  status: ExamStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  _count?: { examQuestions: number };
  examQuestions?: Array<{
    id: string;
    examId: string;
    questionId: string;
    order: number;
    marks: number;
    question?: any;
  }>;
}

export interface ExamListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  courseId?: string;
  semesterId?: string;
  status?: ExamStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error('Request failed');
  return res.data;
}

export function useExams(params: ExamListParams = {}) {
  return useQuery({
    queryKey: ['exams', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
      });
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Exam>>>(`/exams?${search.toString()}`);
      return unwrap(res.data);
    },
  });
}

export function useExam(id: string | undefined) {
  return useQuery({
    queryKey: ['exam', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Exam>>(`/exams/${id}`);
      return unwrap(res.data);
    },
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await apiClient.post<ApiResponse<Exam>>('/exams', input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}

export function useUpdateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Record<string, unknown>) => {
      const res = await apiClient.patch<ApiResponse<Exam>>(`/exams/${id}`, input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/exams/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}

export function useAutoGenerate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, config }: { id: string; config: Record<string, unknown> }) => {
      const res = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/auto-generate`, config);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam'] }),
  });
}

export function useAddQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, questions }: { id: string; questions: { questionId: string; marks: number }[] }) => {
      const res = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/questions`, { questions });
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam'] }),
  });
}

export function useRemoveQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ examId, questionId }: { examId: string; questionId: string }) => {
      const res = await apiClient.delete<ApiResponse<Exam>>(`/exams/${examId}/questions/${questionId}`);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam'] }),
  });
}

export function usePublishExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/publish`, {});
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}

export function useArchiveExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/archive`, {});
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}

export function useReorderQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ examId, order }: { examId: string; order: { questionId: string; order: number }[] }) => {
      const res = await apiClient.post<ApiResponse<Exam>>(`/exams/${examId}/reorder`, { order });
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam'] }),
  });
}
