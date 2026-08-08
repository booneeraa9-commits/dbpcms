/**
 * HTTP client + Mock API switcher.
 *
 * - In production: uses real HTTP via axios
 * - In mock mode (VITE_MOCK_MODE=true): uses localStorage-backed mockApi
 *
 * Toggle via .env: VITE_MOCK_MODE=true|false
 * The switch is transparent to consumers — same return shape.
 */

import axios, { AxiosError } from 'axios';
import { env } from './env';
import { MOCK_MODE, mockApi } from './mockApi';
import type { ApiError } from '@dbpcms/shared';

const ACCESS_TOKEN_KEY = 'dbpcms_access_token';
const REFRESH_TOKEN_KEY = 'dbpcms_refresh_token';

// ─── Token storage ───────────────────────────────────
export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// ─── Custom error ────────────────────────────────────
export class ApiException extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ApiException';
  }
}

// ─── Real axios instance (only used when not in mock mode) ─
export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Mock-mode fetch wrapper ─────────────────────────
// Mimics axios's response shape so the existing code works unchanged.
async function mockFetch<T>(method: string, url: string, data?: any, _config?: any): Promise<{ data: T }> {
  const path = url.split('?')[0];
  const search = url.split('?')[1] ? '?' + url.split('?')[1] : '';
  const params: Record<string, any> = {};
  if (search) {
    new URLSearchParams(search).forEach((v, k) => { params[k] = v; });
  }

  const call = async (handler: () => Promise<any>) => {
    try {
      const res = await handler();
      if (!res.success) {
        throw new ApiException(400, res.error.code, res.error.message, res.error.details);
      }
      return { data: res };
    } catch (err) {
      if (err instanceof ApiException) throw err;
      throw new ApiException(0, 'UNKNOWN_ERROR', (err as Error).message);
    }
  };

  // Route mock calls
  if (path === '/auth/login' && method === 'post') {
    return call(() => mockApi.login(data.email, data.password));
  }
  if (path === '/auth/me' && method === 'get') {
    return call(() => mockApi.me());
  }
  if (path === '/auth/logout' && method === 'post') {
    return call(() => mockApi.logout());
  }
  if (path === '/auth/forgot-password' && method === 'post') {
    return call(() => mockApi.forgotPassword(data.email));
  }
  if (path === '/auth/change-password' && method === 'post') {
    return call(() => mockApi.changePassword(data.currentPassword, data.newPassword));
  }

  if (path === '/departments' && method === 'get') {
    return call(() => mockApi.listDepartments(params));
  }
  if (path === '/departments/active' && method === 'get') {
    return call(() => mockApi.getActiveDepartments());
  }
  if (path === '/departments' && method === 'post') {
    return call(() => mockApi.createDepartment(data));
  }
  if (path.startsWith('/departments/') && method === 'delete') {
    await mockApi.deleteDepartment(path.split('/').pop()!);
    return { data: { success: true, data: null } as any };
  }

  if (path === '/programs' && method === 'get') {
    return call(() => mockApi.listPrograms(params));
  }
  if (path === '/programs' && method === 'post') {
    return call(() => mockApi.createProgram(data));
  }
  if (path.startsWith('/programs/') && method === 'delete') {
    await mockApi.deleteProgram(path.split('/').pop()!);
    return { data: { success: true, data: null } as any };
  }

  if (path === '/courses' && method === 'get') {
    return call(() => mockApi.listCourses(params));
  }
  if (path === '/courses' && method === 'post') {
    return call(() => mockApi.createCourse(data));
  }
  if (path.startsWith('/courses/') && method === 'delete') {
    await mockApi.deleteCourse(path.split('/').pop()!);
    return { data: { success: true, data: null } as any };
  }

  if (path === '/occupations' && method === 'get') {
    return call(() => mockApi.listOccupations());
  }
  if (path === '/occupations/active' && method === 'get') {
    return call(() => mockApi.getActiveOccupations());
  }
  if (path === '/occupations' && method === 'post') {
    return call(() => mockApi.createOccupation(data));
  }

  if (path === '/competencies' && method === 'get') {
    return call(() => mockApi.listCompetencies());
  }
  if (path === '/competencies' && method === 'post') {
    return call(() => mockApi.createCompetency(data));
  }

  if (path === '/academic-years' && method === 'get') {
    return call(() => mockApi.listAcademicYears());
  }
  if (path === '/academic-years/current' && method === 'get') {
    return call(() => mockApi.getCurrentAcademicYear());
  }
  if (path === '/academic-years' && method === 'post') {
    return call(() => mockApi.createAcademicYear(data));
  }

  if (path === '/students' && method === 'get') {
    return call(() => mockApi.listStudents(params));
  }
  if (path === '/students' && method === 'post') {
    return call(() => mockApi.createStudent(data));
  }
  if (path === '/students/import' && method === 'post') {
    return call(() => mockApi.bulkImportStudents(data.students));
  }
  if (path.startsWith('/students/') && path.endsWith('/registrations') && method === 'post') {
    const studentId = path.split('/')[2];
    return call(() => mockApi.registerStudent(studentId, data));
  }
  if (path.startsWith('/students/') && method === 'get') {
    return call(() => mockApi.getStudent(path.split('/').pop()!));
  }
  if (path.startsWith('/students/') && method === 'delete') {
    await mockApi.deleteStudent(path.split('/').pop()!);
    return { data: { success: true, data: null } as any };
  }

  if (path === '/users' && method === 'get') {
    return call(() => mockApi.listUsers());
  }
  if (path === '/users' && method === 'post') {
    return call(() => mockApi.createUser(data));
  }
  if (path === '/users/roles' && method === 'get') {
    return call(() => mockApi.getRoles());
  }

  // ─── Questions ───
  if (path === '/questions' && method === 'get') {
    return call(() => mockApi.listQuestions(params));
  }
  if (path === '/questions' && method === 'post') {
    // Need current user id from session
    const session = JSON.parse(localStorage.getItem('dbpcms_mock_session') || '{}');
    const userId = session.user?.id;
    if (!userId) return { data: { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } } as any };
    return call(() => mockApi.createQuestion(data, userId));
  }
  if (path.startsWith('/questions/') && path.endsWith('/submit') && method === 'post') {
    const id = path.split('/')[2];
    const session = JSON.parse(localStorage.getItem('dbpcms_mock_session') || '{}');
    const userId = session.user?.id;
    if (!userId) return { data: { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } } as any };
    return call(() => mockApi.submitQuestionForReview(id, userId));
  }
  if (path.startsWith('/questions/') && path.endsWith('/review') && method === 'post') {
    const id = path.split('/')[2];
    const session = JSON.parse(localStorage.getItem('dbpcms_mock_session') || '{}');
    const userId = session.user?.id;
    if (!userId) return { data: { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } } as any };
    return call(() => mockApi.reviewQuestion(id, data, userId));
  }
  if (path.startsWith('/questions/') && path.endsWith('/approve') && method === 'post') {
    const id = path.split('/')[2];
    const session = JSON.parse(localStorage.getItem('dbpcms_mock_session') || '{}');
    const userId = session.user?.id;
    if (!userId) return { data: { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } } as any };
    return call(() => mockApi.approveQuestion(id, userId));
  }
  if (path.startsWith('/questions/') && method === 'get') {
    return call(() => mockApi.getQuestion(path.split('/').pop()!));
  }
  if (path.startsWith('/questions/') && method === 'patch') {
    const id = path.split('/').pop()!;
    const session = JSON.parse(localStorage.getItem('dbpcms_mock_session') || '{}');
    const userId = session.user?.id;
    if (!userId) return { data: { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } } as any };
    return call(() => mockApi.updateQuestion(id, data, userId));
  }
  if (path.startsWith('/questions/') && method === 'delete') {
    const id = path.split('/').pop()!;
    const session = JSON.parse(localStorage.getItem('dbpcms_mock_session') || '{}');
    const userId = session.user?.id;
    if (!userId) return { data: { success: true, data: null } as any };
    await mockApi.deleteQuestion(id, userId);
    return { data: { success: true, data: null } as any };
  }

  // ─── Exams ───
  if (path === '/exams' && method === 'get') {
    return call(() => mockApi.listExams(params));
  }
  if (path === '/exams' && method === 'post') {
    return call(() => mockApi.createExam(data));
  }
  if (path.startsWith('/exams/') && path.endsWith('/auto-generate') && method === 'post') {
    const id = path.split('/')[2];
    return call(() => mockApi.autoGenerateExam(id, data));
  }
  if (path.startsWith('/exams/') && path.endsWith('/questions') && method === 'post') {
    const id = path.split('/')[2];
    return call(() => mockApi.addQuestionsToExam(id, data.questions));
  }
  if (path.startsWith('/exams/') && path.includes('/questions/') && method === 'delete') {
    const parts = path.split('/');
    const examId = parts[2];
    const questionId = parts[4];
    return call(() => mockApi.removeQuestionFromExam(examId, questionId));
  }
  if (path.startsWith('/exams/') && path.endsWith('/publish') && method === 'post') {
    const id = path.split('/')[2];
    return call(() => mockApi.publishExam(id));
  }
  if (path.startsWith('/exams/') && path.endsWith('/archive') && method === 'post') {
    const id = path.split('/')[2];
    return call(() => mockApi.archiveExam(id));
  }
  if (path.startsWith('/exams/') && path.endsWith('/reorder') && method === 'post') {
    const id = path.split('/')[2];
    return call(() => mockApi.reorderQuestions(id, data.order));
  }
  if (path.startsWith('/exams/') && method === 'get') {
    return call(() => mockApi.getExam(path.split('/').pop()!));
  }
  if (path.startsWith('/exams/') && method === 'patch') {
    const id = path.split('/').pop()!;
    return call(() => mockApi.updateExam(id, data));
  }
  if (path.startsWith('/exams/') && method === 'delete') {
    const id = path.split('/').pop()!;
    await mockApi.deleteExam(id);
    return { data: { success: true, data: null } as any };
  }

  // ─── Results ───
  if (path === '/results' && method === 'get') {
    return call(() => mockApi.listResults(params));
  }
  if (path === '/results' && method === 'post') {
    return call(() => mockApi.createResult(data));
  }
  if (path === '/results/bulk' && method === 'post') {
    return call(() => mockApi.bulkCreateResults(data.results));
  }
  if (path.startsWith('/results/transcript/') && method === 'get') {
    const id = path.split('/').pop()!;
    return call(() => mockApi.getTranscript(id));
  }
  if (path.startsWith('/results/') && method === 'post' && (path.endsWith('/verify') || path.endsWith('/approve') || path.endsWith('/authorize') || path.endsWith('/publish') || path.endsWith('/reject'))) {
    const parts = path.split('/');
    const id = parts[2];
    const action = parts[3];
    const session = JSON.parse(localStorage.getItem('dbpcms_mock_session') || '{}');
    const userId = session.user?.id || 'mock-user';
    return call(() => mockApi.workflowResult(id, action, userId, data?.reason));
  }
  if (path.startsWith('/results/') && method === 'get') {
    const id = path.split('/').pop()!;
    return call(() => mockApi.getResult(id));
  }
  if (path.startsWith('/results/') && method === 'patch') {
    const id = path.split('/').pop()!;
    // Note: mock doesn't implement update yet, but return error gracefully
    return { data: { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Update not implemented in mock' } } as any };
  }
  if (path.startsWith('/results/') && method === 'delete') {
    return { data: { success: true, data: null } as any };
  }

  // ─── Notifications ───
  if (path === '/notifications' && method === 'get') {
    const session = JSON.parse(localStorage.getItem('dbpcms_mock_session') || '{}');
    return call(() => mockApi.listNotifications(session.user?.id, params));
  }
  if (path === '/notifications/unread-count' && method === 'get') {
    const session = JSON.parse(localStorage.getItem('dbpcms_mock_session') || '{}');
    return call(() => mockApi.getUnreadNotificationCount(session.user?.id));
  }
  if (path === '/notifications/mark-all-read' && method === 'post') {
    const session = JSON.parse(localStorage.getItem('dbpcms_mock_session') || '{}');
    return call(() => mockApi.markAllNotificationsRead(session.user?.id));
  }
  if (path.startsWith('/notifications/') && path.endsWith('/read') && method === 'post') {
    const id = path.split('/')[2];
    const session = JSON.parse(localStorage.getItem('dbpcms_mock_session') || '{}');
    return call(() => mockApi.markNotificationRead(id, session.user?.id));
  }
  if (path.startsWith('/notifications/') && method === 'delete') {
    const id = path.split('/').pop()!;
    const session = JSON.parse(localStorage.getItem('dbpcms_mock_session') || '{}');
    return call(() => mockApi.deleteNotification(id, session.user?.id));
  }

  // ─── Activity Log ───
  if (path === '/activity' && method === 'get') {
    return call(() => mockApi.listActivity(params));
  }
  if (path === '/activity/recent' && method === 'get') {
    return call(() => mockApi.getRecentActivity(params.limit || 10));
  }
  if (path === '/activity/stats' && method === 'get') {
    return call(() => mockApi.getActivityStats());
  }

  throw new ApiException(404, 'MOCK_NOT_IMPLEMENTED', `Mock route not implemented: ${method.toUpperCase()} ${path}`);
}

// ─── API entry point — switches between mock and real ─
export async function apiCall<T = any>(
  method: 'get' | 'post' | 'patch' | 'put' | 'delete',
  url: string,
  data?: any,
): Promise<{ data: T }> {
  if (MOCK_MODE) {
    return mockFetch<T>(method, url, data);
  }
  return api.request({ method, url, data }) as any;
}

// ─── Convenience methods ─────────────────────────────
export const apiClient = {
  get:    <T>(url: string)            => apiCall<T>('get', url),
  post:   <T>(url: string, data: any) => apiCall<T>('post', url, data),
  patch:  <T>(url: string, data: any) => apiCall<T>('patch', url, data),
  put:    <T>(url: string, data: any) => apiCall<T>('put', url, data),
  delete: <T>(url: string)            => apiCall<T>('delete', url),
};

// ─── Auth interceptor (only for real mode) ───────────
if (!MOCK_MODE) {
  let refreshPromise: Promise<string> | null = null;
  async function performRefresh(): Promise<string> {
    const refreshToken = tokenStore.getRefresh();
    if (!refreshToken) throw new ApiException(401, 'NO_REFRESH_TOKEN', 'No refresh token');
    const response = await axios.post(`${env.apiUrl}/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefresh } = response.data.data.tokens;
    tokenStore.set(accessToken, newRefresh);
    return accessToken;
  }
  async function refreshAccessToken(): Promise<string> {
    if (!refreshPromise) refreshPromise = performRefresh().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
      const originalRequest = error.config as any;
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes('/auth/refresh') &&
        !originalRequest.url?.includes('/auth/login')
      ) {
        originalRequest._retry = true;
        try {
          const newAccess = await refreshAccessToken();
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch (refreshError) {
          tokenStore.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
      if (error.response?.data) {
        const e = error.response.data;
        throw new ApiException(error.response.status, e.error?.code ?? 'UNKNOWN', e.error?.message ?? 'An error occurred', e.error?.details);
      }
      if (error.request) {
        throw new ApiException(0, 'NETWORK_ERROR', 'Cannot reach the server. Please check your connection.');
      }
      throw new ApiException(0, 'UNKNOWN_ERROR', error.message);
    },
  );
}

// ─── Expose a flag for UI ────────────────────────────
export const isMockMode = MOCK_MODE;
