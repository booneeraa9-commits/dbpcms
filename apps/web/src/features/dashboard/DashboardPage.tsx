import type { JSX } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Users, GraduationCap, Building2, BookOpen, Layers, UserCog,
  Activity, Loader2, ClipboardList, CalendarClock, UserPlus, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";
import { useAuth } from "@/features/auth/AuthContext";
import { dashboardApi, type DashboardSummary } from "./api";

const CARD_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; to?: string }> = {
  users: { label: "Users", icon: UserCog, to: "/admin" },
  employees: { label: "Employees", icon: Users, to: "/employees" },
  students: { label: "Students", icon: GraduationCap, to: "/students" },
  departments: { label: "Departments", icon: Building2, to: "/departments" },
  courses: { label: "Courses", icon: BookOpen, to: "/academic" },
  sections: { label: "Sections", icon: Layers, to: "/academic" },
};

const PIE_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", submitted: "Submitted", dept_approved: "Approved", published: "Published", returned: "Returned",
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return <div className={"rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 " + className}>{children}</div>;
}

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardApi.summary() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Welcome{user ? `, ${user.fullName}` : ""}
        </h1>
        <p className="text-sm text-slate-500">
          {user ? `Signed in as ${user.roles.join(", ")}.` : "Donna Barbar Polytechnic College."}
        </p>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>}
      {isError && (
        <Card><p className="text-sm text-red-600">Could not load the dashboard. <button className="underline" onClick={() => void refetch()}>Retry</button></p></Card>
      )}

      {data && <DashboardContent data={data} navigate={navigate} />}
    </div>
  );
}

function DashboardContent({ data, navigate }: { data: DashboardSummary; navigate: (to: string) => void }): JSX.Element {
  const countKeys = Object.keys(data.counts) as (keyof typeof data.counts)[];

  return (
    <>
      {/* Count cards */}
      {countKeys.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {countKeys.map((key) => {
            const meta = CARD_META[key];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => meta.to && navigate(meta.to)}
                className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-brand-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{meta.label}</p>
                  <Icon className="h-5 w-5 text-brand-500" />
                </div>
                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{data.counts[key]}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* HR quick stats */}
      {data.hr && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15"><UserPlus className="h-5 w-5" /></div>
              <div><p className="text-sm text-slate-500">New employees this month</p><p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{data.hr.newThisMonth}</p></div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15"><CalendarClock className="h-5 w-5" /></div>
              <div><p className="text-sm text-slate-500">Contracts expiring (60 days)</p><p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{data.hr.contractsExpiring}</p></div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Employees by department */}
        {data.employeesByDepartment && data.employeesByDepartment.length > 0 && (
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Employees by department</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.employeesByDepartment}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Students by status */}
        {data.studentsByStatus && data.studentsByStatus.length > 0 && (
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Students by status</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.studentsByStatus} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                  {data.studentsByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Grade pipeline */}
      {data.gradePipeline && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Grade submission pipeline</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(Object.entries(data.gradePipeline) as [string, number][]).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-200 p-3 text-center dark:border-slate-800">
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{v}</p>
                <p className="text-xs text-slate-500">{STATUS_LABEL[k] ?? k}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Instructor: my sections */}
      {data.mySections && (
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><ClipboardList className="h-4 w-4" /> My sections</h2>
          {data.mySections.length === 0 ? (
            <p className="text-sm text-slate-500">You have no assigned sections yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.mySections.map((s) => (
                <li key={s.sectionId} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.course}</p>
                    <p className="text-xs text-slate-500">{s.semester} · {s.enrolled} students · {STATUS_LABEL[s.status] ?? s.status}</p>
                  </div>
                  <button type="button" onClick={() => navigate("/grade-entry")} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                    Enter grades <ArrowRight className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Recent activity */}
      {data.recentActivity && (
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Activity className="h-4 w-4" /> Recent activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentActivity.map((a, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{a.who}</span>{" "}
                    <span className="font-mono text-xs text-slate-500">{a.action}</span>
                  </span>
                  <span className="text-xs text-slate-400">{new Date(a.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
