import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@dbpcms/shared';
import type { Program } from './useAcademics';

export interface Student {
  id: string;
  studentIdNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  birthDate: string;
  age: number;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  photoUrl: string | null;
  qrCodeUrl: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  previousSchool: string | null;
  previousGrade: string | null;
  programId: string;
  programName?: string;
  programCode?: string;
  departmentName?: string;
  admissionDate: string;
  status: 'ACTIVE' | 'GRADUATED' | 'SUSPENDED' | 'WITHDRAWN' | 'TRANSFERRED';
  currentRegistration: {
    academicYearId: string;
    academicYearName: string;
    level: number;
    section: string | null;
  } | null;
  createdAt: string;
  _count?: { registrations: number; results: number };
}

export interface StudentListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  programId?: string;
  level?: number;
  gender?: string;
  academicYearId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error('Request failed');
  return res.data;
}

export function useStudents(params: StudentListParams = {}) {
  return useQuery({
    queryKey: ['students', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
      });
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Student>>>(`/students?${search.toString()}`);
      return unwrap(res.data);
    },
  });
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: ['student', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Student>>(`/students/${id}`);
      return unwrap(res.data);
    },
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await apiClient.post<ApiResponse<Student>>('/students', input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Record<string, unknown>) => {
      const res = await apiClient.patch<ApiResponse<Student>>(`/students/${id}`, input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/students/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useRegisterStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studentId: string; academicYearId: string; level: number; section?: string; rollNumber?: string }) => {
      const res = await apiClient.post<ApiResponse<unknown>>(`/students/${input.studentId}/registrations`, input);
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useBulkImportStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (students: Record<string, unknown>[]) => {
      const res = await apiClient.post<ApiResponse<{ created: number; failed: unknown[]; students: Student[] }>>(
        '/students/import',
        { students },
      );
      return unwrap(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export type { Program };
