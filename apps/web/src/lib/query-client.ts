import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query manages all server data (caching, loading/error states,
 * background refresh). One shared client for the whole app.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
