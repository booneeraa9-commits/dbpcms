/**
 * Global app providers (React Query, Router, Toaster).
 * Wrap the entire app with these so all child components can use them.
 */

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // Data is fresh for 30s by default
      retry: (failureCount, error: unknown) => {
        // Don't retry 401/403/404 — they're not going to suddenly succeed
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '14px' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
