import type { JSX } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Users, GraduationCap, Building2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";

/**
 * A placeholder dashboard for the Phase 1 skeleton. It also proves the
 * frontend can reach the backend: it calls /api/v1/health and shows the result.
 * Real role-specific dashboards arrive in Phase 8.
 */

interface HealthResponse {
  success: boolean;
  data: { status: string; service: string };
}

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/v1/health");
  if (!res.ok) throw new Error("API not reachable");
  return (await res.json()) as HealthResponse;
}

const STATS = [
  { label: "Users", value: "—", icon: Users },
  { label: "Employees", value: "—", icon: Users },
  { label: "Students", value: "—", icon: GraduationCap },
  { label: "Departments", value: "—", icon: Building2 },
];

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome{user ? `, ${user.fullName}` : ""}
        </h1>
        <p className="text-sm text-slate-500">
          Donna Barbar Polytechnic College Management System.
          {user ? ` Signed in as ${user.roles.join(", ")}.` : ""}
        </p>
      </div>

      {/* Backend connectivity indicator */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div
          className={
            "flex h-10 w-10 items-center justify-center rounded-full " +
            (isError
              ? "bg-red-100 text-red-600"
              : "bg-emerald-100 text-emerald-600")
          }
        >
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">Backend status</p>
          <p className="text-sm text-slate-500">
            {isLoading
              ? "Checking API connection…"
              : isError
                ? "API not reachable — start the backend (pnpm dev:api)."
                : `Connected · ${data?.data.service} · ${data?.data.status}`}
          </p>
        </div>
      </div>

      {/* Stat cards (empty until modules are built) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <stat.icon className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Available once the module is built
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
