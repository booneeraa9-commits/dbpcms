import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@dbpcms/shared';

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  headId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { programs: number; courses: number };
}

export interface Program {
  id: string;
  code: string;
  name: string;
  description: string | null;
  departmentId: string;
  departmentName?: string;
  durationYears: number;
  totalCredits: number;
  levels: number[];
  occupations: { id: string; code: string; name: string }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { students: number; courses: number };
}

export interface Occupation {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { programs: number };
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  departmentId: string;
  departmentName?: string;
  programId: string | null;
  programName?: string | null;
  level: number;
  credits: number;
  theoryHours: number;
  practicalHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  competencies: { id: string; code: string; name: string }[];
  _count?: { questions: number; assignments: number };
}

export interface Competency {
  id: string;
  code: string;
  name: string;
  description: string | null;
  _count?: { courses: number };
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isActive: boolean;
  semesters: Semester[];
}

export interface Semester {
  id: string;
  academicYearId: string;
  name: string;
  number: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error('Request failed');
  return res.data;
}

export function useDepartments(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['departments', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
      });
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Department>>>(`/departments?${search.toString()}`);
      return unwrap(res.data);
    },
  });
}

export function useActiveDepartments() {
  return useQuery({
    queryKey: ['departments', 'active'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<{ id: string; code: string; name: string }[]>>('/departments/active');
      return unwrap(res.data);
    },
    staleTime: 60_000,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await apiClient.post<ApiResponse<Department>>('/departments', input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/departments/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function usePrograms(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['programs', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
      });
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Program>>>(`/programs?${search.toString()}`);
      return unwrap(res.data);
    },
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await apiClient.post<ApiResponse<Program>>('/programs', input);
      return unwrap(res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/programs/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useOccupations() {
  return useQuery({
    queryKey: ['occupations'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Occupation>>>('/occupations');
      return unwrap(res.data);
    },
  });
}

export function useActiveOccupations() {
  return useQuery({
    queryKey: ['occupations', 'active'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<{ id: string; code: string; name: string }[]>>('/occupations/active');
      return unwrap(res.data);
    },
    staleTime: 60_000,
  });
}

export function useCreateOccupation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await apiClient.post<ApiResponse<Occupation>>('/occupations', input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['occupations'] }),
  });
}

export function useCourses(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['courses', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
      });
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Course>>>(`/courses?${search.toString()}`);
      return unwrap(res.data);
    },
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await apiClient.post<ApiResponse<Course>>('/courses', input);
      return unwrap(res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/courses/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useCompetencies() {
  return useQuery({
    queryKey: ['competencies'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Competency[]>>('/competencies');
      return unwrap(res.data);
    },
  });
}

export function useCreateCompetency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await apiClient.post<ApiResponse<Competency>>('/competencies', input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competencies'] }),
  });
}

export function useAcademicYears() {
  return useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<AcademicYear[]>>('/academic-years');
      return unwrap(res.data);
    },
  });
}

export function useCurrentAcademicYear() {
  return useQuery({
    queryKey: ['academic-years', 'current'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<{ year: AcademicYear | null; semester: Semester | null }>>('/academic-years/current');
      return unwrap(res.data);
    },
  });
}

export function useCreateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await apiClient.post<ApiResponse<AcademicYear>>('/academic-years', input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}
