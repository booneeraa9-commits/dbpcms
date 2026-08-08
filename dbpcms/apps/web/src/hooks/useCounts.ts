/**
 * Dashboard counts — gets totals for each module.
 * Uses list endpoints with pageSize=1 to read just the meta.total.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@dbpcms/shared';

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error('Request failed');
  return res.data;
}

export interface ModuleCount {
  total: number;
  isLoading: boolean;
}

export function useModuleCount(endpoint: string, enabled = true) {
  return useQuery({
    queryKey: ['count', endpoint],
    enabled,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<any>>>(`${endpoint}?pageSize=1`);
      return unwrap(res.data).meta?.total ?? 0;
    },
    staleTime: 60_000,
  });
}

export function useDashboardCounts() {
  const students = useModuleCount('/students');
  const departments = useModuleCount('/departments');
  const programs = useModuleCount('/programs');
  const courses = useModuleCount('/courses');
  const questions = useModuleCount('/questions');
  const exams = useModuleCount('/exams');
  const results = useModuleCount('/results');
  const users = useModuleCount('/users');

  return {
    students: students.data ?? 0,
    departments: departments.data ?? 0,
    programs: programs.data ?? 0,
    courses: courses.data ?? 0,
    questions: questions.data ?? 0,
    exams: exams.data ?? 0,
    results: results.data ?? 0,
    users: users.data ?? 0,
    isLoading: students.isLoading || departments.isLoading || questions.isLoading,
  };
}
