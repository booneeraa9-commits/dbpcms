import type { JSX } from "react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building2,
  ShieldCheck,
  Menu,
  Bell,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The application shell shared by every page: a sidebar (navigation), a top bar
 * (search, notifications, user), and a content area where each page renders.
 *
 * NOTE: In Phase 3 the sidebar items will be filtered by the logged-in user's
 * permissions. For now the skeleton shows the structure.
 */

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Employees", to: "/employees", icon: Users },
  { label: "Grading", to: "/grading", icon: GraduationCap },
  { label: "Departments", to: "/departments", icon: Building2 },
  { label: "Administration", to: "/admin", icon: ShieldCheck },
];

export function AppLayout(): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
            DB
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">DBPCMS</p>
            <p className="text-xs text-slate-500">Polytechnic College</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <button
            type="button"
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
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
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-500 outline-none"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                A
              </div>
              <span className="text-sm font-medium text-slate-700">Admin</span>
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
