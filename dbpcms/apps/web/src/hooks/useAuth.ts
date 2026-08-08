import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, tokenStore } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { User, LoginInput, ApiResponse } from '@dbpcms/shared';

interface AuthResponse {
  user: User;
  tokens: { accessToken: string; refreshToken: string };
}

export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clear = useAuthStore((s) => s.clear);

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      if (!tokenStore.getAccess()) return null;
      const res = await apiClient.get<ApiResponse<User>>('/auth/me');
      if (!res.data.success) throw new Error('Failed to load user');
      return res.data.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (query.data && useAuthStore.getState().user?.id !== query.data.id) {
    setUser(query.data);
  } else if (query.error) {
    clear();
  }
  if (query.isLoading !== useAuthStore.getState().isLoading) {
    setLoading(query.isLoading);
  }

  return query;
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', input);
      if (!res.data.success) throw new Error((res.data as any).error?.message || 'Login failed');
      return res.data.data;
    },
    onSuccess: (data) => {
      tokenStore.set(data.tokens.accessToken, data.tokens.refreshToken);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: async () => {
      const refreshToken = tokenStore.getRefresh() ?? undefined;
      await apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
    },
    onSettled: () => {
      tokenStore.clear();
      clear();
      queryClient.clear();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      const res = await apiClient.post('/auth/change-password', input);
      return res.data;
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await apiClient.post<ApiResponse<{ message: string; devResetToken?: string }>>(
        '/auth/forgot-password',
        { email },
      );
      if (!res.data.success) throw new Error('Request failed');
      return res.data.data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: { token: string; newPassword: string; confirmPassword: string }) => {
      const res = await apiClient.post('/auth/reset-password', input);
      return res.data;
    },
  });
}
