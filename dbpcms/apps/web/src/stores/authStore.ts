/**
 * Auth store — holds current user state globally.
 * Uses Zustand because it's tiny (1KB) and dead simple.
 *
 * We store:
 *   - user: the logged-in user (null if not)
 *   - isAuthenticated: derived
 *   - hasRole, hasPermission: helpers for UI gates
 *
 * Tokens are stored separately in localStorage (via tokenStore in lib/api.ts).
 */

import { create } from 'zustand';
import type { User } from '@dbpcms/shared';
import type { Role, Permission } from '@dbpcms/shared';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
  hasRole: (role: Role | Role[]) => boolean;
  hasPermission: (permission: Permission | Permission[]) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, isLoading: false }),

  hasRole: (role) => {
    const u = get().user;
    if (!u) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.some((r) => u.roles.includes(r));
  },

  hasPermission: (permission) => {
    const u = get().user;
    if (!u) return false;
    const perms = Array.isArray(permission) ? permission : [permission];
    return perms.some((p) => u.permissions.includes(p));
  },

  hasAnyRole: (roles) => {
    const u = get().user;
    if (!u) return false;
    return roles.some((r) => u.roles.includes(r));
  },
}));
