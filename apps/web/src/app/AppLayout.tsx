import type { JSX } from "react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserSquare2,
  Building2,
  BookOpen,
  BarChart3,
  ShieldCheck,
  Menu,
  Bell,
  Search,
  LogOut,
  Sun,
  Moon,
  Languages,
} from "lucide-react";
import { PERMISSIONS } from "@dbpcms/shared";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { useTheme } from "@/app/ThemeProvider";
import { useLanguage, LANGUAGES } from "@/app/LanguageProvider";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Employees", to: "/employees", icon: Users, permission: PERMISSIONS.EMPLOYEE_READ },
  { label: "Students", to: "/students", icon: UserSquare2, permission: PERMISSIONS.STUDENT_READ },
  { label: "Grading Setup", to: "/grading-config", icon: GraduationCap, permission: PERMISSIONS.GRADE_ENTER },
  { label: "Departments", to: "/departments", icon: Building2, permission: PERMISSIONS.DEPARTMENT_READ },
  { label: "Academic", to: "/academic", icon: BookOpen, permission: PERMISSIONS.PROGRAM_READ },
  { label: "Reports", to: "/reports", icon: BarChart3, permission: PERMISSIONS.REPORT_VIEW },
  { label: "Administration", to: "/admin", icon: ShieldCheck, permission: PERMISSIONS.USER_READ },
];

export function AppLayout(): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, hasPermission, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  const initials = (user?.fullName ?? "User")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 dark:border-slate-800 dark:bg-slate-900",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
            DB
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">DBPCMS</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Polytechnic College</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-100"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search (coming soon)…"
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700">
              <Languages className="h-4 w-4 text-slate-500" />
              <select
                aria-label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "om")}
                className="bg-transparent text-sm text-slate-700 outline-none dark:text-slate-200"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggle}
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button
              type="button"
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2 dark:border-slate-700">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                {initials}
              </div>
              <span className="hidden text-sm font-medium text-slate-700 sm:inline dark:text-slate-200">
                {user?.fullName ?? "User"}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
