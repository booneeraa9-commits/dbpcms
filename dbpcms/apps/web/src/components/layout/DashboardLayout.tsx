/**
 * Dashboard layout — authenticated app shell.
 *   ┌──────────────────────────────────────────────┐
 *   │  Topbar (logo, search, notifications, user)  │
 *   ├──────┬───────────────────────────────────────┤
 *   │      │                                       │
 *   │ Side │  Page content (Outlet)                │
 *   │ bar  │                                       │
 *   │      │                                       │
 *   └──────┴───────────────────────────────────────┘
 */

import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  GraduationCap,
  FileQuestion,
  ClipboardList,
  BarChart3,
  Bell,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  User as UserIcon,
  KeyRound,
  Sun,
  Moon,
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Logo } from '@/components/ui/Logo';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useLogout } from '@/hooks/useAuth';
import { PERMISSIONS, ROLE_LABELS } from '@dbpcms/shared';
import { DemoBanner } from '@/components/feedback/DemoBanner';
import clsx from 'clsx';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const logout = useLogout();
  const navigate = useNavigate();

  // CRITICAL: Apply theme on every render and on mount.
  // This ensures the dark class is always in sync with the store.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    console.log('[Theme] Applied:', theme, '| HTML classes:', root.className);
  }, [theme]);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build NAV inside the component so hasPermission() reacts to user changes
  const NAV = [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { to: '/app/users', label: 'Users', icon: Users, show: hasPermission(PERMISSIONS.USER_VIEW) && user?.roles.includes('super_admin' as any) },
    { to: '/app/students', label: 'Students', icon: Users, show: hasPermission(PERMISSIONS.STUDENT_VIEW) },
    { to: '/app/departments', label: 'Departments', icon: Building2, show: hasPermission(PERMISSIONS.DEPARTMENT_VIEW) },
    { to: '/app/programs', label: 'Programs', icon: GraduationCap, show: hasPermission(PERMISSIONS.DEPARTMENT_VIEW) },
    { to: '/app/courses', label: 'Courses', icon: BookOpen, show: hasPermission(PERMISSIONS.COURSE_VIEW) },
    { to: '/app/academic-years', label: 'Academic Years', icon: BookOpen, show: hasPermission(PERMISSIONS.DEPARTMENT_MANAGE) },
    { to: '/app/questions', label: 'Question Bank', icon: FileQuestion, show: hasPermission(PERMISSIONS.QUESTION_VIEW) },
    { to: '/app/exams', label: 'Exams', icon: ClipboardList, show: hasPermission(PERMISSIONS.EXAM_VIEW) },
    { to: '/app/results', label: 'Results', icon: BarChart3, show: hasPermission(PERMISSIONS.REPORT_VIEW) || hasPermission(PERMISSIONS.RESULT_VIEW_OWN) },
    { to: '/app/notifications', label: 'Notifications', icon: Bell, show: true },
    { to: '/app/activity', label: 'Activity Log', icon: History, show: user?.roles.includes('super_admin' as any) || user?.roles.includes('principal' as any) },
  ].filter((item) => item.show);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate('/login', { replace: true }),
    });
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : '?';
  const primaryRole = user?.roles[0] ? ROLE_LABELS[user.roles[0]] : 'User';

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <DemoBanner />
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar (desktop) ─── */}
        <aside className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="flex h-16 items-center border-b border-gray-200 px-4 dark:border-gray-700">
              <Link to="/app/dashboard">
                <Logo />
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1">
                {NAV.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700',
                        )
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t border-gray-200 p-3 space-y-1 dark:border-gray-700">
              <NavLink
                to="/app/profile"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <Settings className="h-5 w-5" />
                Settings
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* ─── Sidebar (mobile drawer) ─── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-gray-900/50" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-gray-800">
              <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
                <Logo />
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="p-3">
                <ul className="space-y-1">
                  {NAV.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                            isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100',
                          )
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          </div>
        )}

        {/* ─── Main content ─── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search students, questions, courses…"
                  className="form-input w-80 pl-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <NotificationBell />

              {/* User menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm dark:bg-primary-500/20 dark:text-primary-300">
                    {initials}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user ? `${user.firstName} ${user.lastName}` : 'Loading…'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{primaryRole}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 hidden md:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg z-50 dark:border-gray-700 dark:bg-gray-800">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user?.firstName} {user?.lastName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {user?.roles.map((r) => (
                          <span key={r} className="badge-info text-[10px]">
                            {ROLE_LABELS[r]}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/app/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        <UserIcon className="h-4 w-4" />
                        My profile
                      </Link>
                      <Link
                        to="/app/profile/change-password"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        <KeyRound className="h-4 w-4" />
                        Change password
                      </Link>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                      </button>
                    </div>
                    <div className="border-t border-gray-100 py-1 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50 dark:bg-gray-900">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
