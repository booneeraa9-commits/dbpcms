/**
 * ProtectedRoute — wraps routes that need authentication.
 * If not logged in → redirect to /login.
 * If logged in but lacks required role/permission → redirect to /forbidden.
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useCurrentUser } from '@/hooks/useAuth';
import { PageLoader } from '@/components/feedback/PageLoader';
import type { Role, Permission } from '@dbpcms/shared';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: Role[];
  permissions?: Permission[];
}

export function ProtectedRoute({ children, roles, permissions }: ProtectedRouteProps) {
  const location = useLocation();
  const { data: _user, isLoading } = useCurrentUser();
  const user = useAuthStore((s) => s.user);
  const hasRole = useAuthStore((s) => s.hasRole);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  if (isLoading) return <PageLoader />;

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Role check
  if (roles && roles.length > 0 && !hasRole(roles)) {
    return <Navigate to="/forbidden" replace />;
  }

  // Permission check
  if (permissions && permissions.length > 0 && !hasPermission(permissions)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
