import type { JSX } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  setAccessToken,
  setAuthFailureHandler,
} from "@/lib/api-client";
import type { AuthUser, LoginResponse } from "./types";

/**
 * Holds the logged-in user in React state and exposes login/logout plus a
 * permission checker. On first load it tries to silently restore a session
 * using the refresh cookie, so a page refresh doesn't log you out.
 */
interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore network errors on logout
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    const { user: me } = await api.get<{ user: AuthUser }>("/auth/me");
    setUser(me);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const data = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      setAccessToken(data.accessToken);
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const hasPermission = useCallback(
    (permission: string): boolean =>
      user?.permissions.includes(permission) ?? false,
    [user],
  );

  // On mount: register the auth-failure handler and try to restore a session.
  useEffect(() => {
    setAuthFailureHandler(() => {
      setAccessToken(null);
      setUser(null);
    });

    (async () => {
      try {
        // Attempt a silent refresh; if it works, /auth/me succeeds.
        await api.get<{ user: AuthUser }>("/auth/me");
        await refreshUser();
      } catch {
        // Not logged in — that's fine.
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshUser]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout, refreshUser, hasPermission }),
    [user, isLoading, login, logout, refreshUser, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
