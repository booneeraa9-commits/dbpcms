/**
 * Dashboard home — personalized with real user data.
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, Building2, FileQuestion, GraduationCap, TrendingUp, Activity, Shield,
  Database, BookOpen, BarChart3, ClipboardList, FileSpreadsheet, ArrowRight, Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_LABELS, PERMISSIONS } from '@dbpcms/shared';
import { isMockMode } from '@/lib/api';
import { useStudents } from '@/hooks/useStudents';
import { useDepartments } from '@/hooks/useAcademics';
import { useDashboardCounts } from '@/hooks/useCounts';
import { useRecentActivity } from '@/hooks/useActivity';
import { useNotifications } from '@/hooks/useNotifications';
import { useResults } from '@/hooks/useResults';

export default function DashboardHome() {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const counts = useDashboardCounts();
  const { data: studentsData } = useStudents({ pageSize: 1 });
  const { data: deptData } = useDepartments({ pageSize: 1 });
  const { data: recentActivity } = useRecentActivity(8);
  const { data: notifData } = useNotifications({ pageSize: 4 });
  const { data: pendingResults } = useResults({ status: 'PENDING_VERIFICATION', pageSize: 5 });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const unreadCount = (notifData?.items ?? []).filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {greeting}, {user?.firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            You're signed in as{' '}
            <strong>{user?.roles.map((r) => ROLE_LABELS[r]).join(', ')}</strong>.
          </p>
        </div>
        {isMockMode && (
          <div className="flex items-center gap-2 text-sm bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 px-3 py-1.5 rounded-full">
            <Sparkles className="h-4 w-4" />
            Demo mode — sample data
          </div>
        )}
      </div>

      {/* KPI cards with LIVE data */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Students" value={counts.students} loading={counts.isLoading} color="primary" link="/app/students" />
        <Kpi icon={Building2} label="Departments" value={counts.departments} loading={counts.isLoading} color="success" link="/app/departments" />
        <Kpi icon={BookOpen} label="Courses" value={counts.courses} loading={counts.isLoading} color="warning" link="/app/courses" />
        <Kpi icon={FileQuestion} label="Questions" value={counts.questions} loading={counts.isLoading} color="primary" link="/app/questions" />
        <Kpi icon={ClipboardList} label="Exams" value={counts.exams} loading={counts.isLoading} color="success" link="/app/exams" />
        <Kpi icon={FileSpreadsheet} label="Results" value={counts.results} loading={counts.isLoading} color="warning" link="/app/results" />
        <Kpi icon={GraduationCap} label="Users" value={counts.users} loading={counts.isLoading} color="primary" link="/app/users" />
        <Kpi icon={Activity} label="Notifications" value={unreadCount} loading={false} color="primary" link="/app/notifications" />
      </div>

      {/* Pending tasks (only if there are pending results) */}
      {hasPermission(PERMISSIONS.RESULT_VERIFY) && pendingResults?.items && pendingResults.items.length > 0 && (
        <div className="card overflow-hidden border-warning-200 dark:border-warning-500/30">
          <div className="bg-warning-50 dark:bg-warning-500/10 p-4 border-b border-warning-200 dark:border-warning-500/20 flex items-center gap-3">
            <Shield className="h-5 w-5 text-warning-600" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {pendingResults.items.length} result{pendingResults.items.length === 1 ? '' : 's'} need your attention
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pending verification — these are waiting for the Department Head.
              </p>
            </div>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {pendingResults.items.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/app/results/${r.id}`}
                  className="p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {r.studentName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.courseCode} · {r.assessmentType} · {r.marksObtained}/{r.marksTotal} ({r.percentage}%)
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Two-column area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              Quick Actions
            </h2>
          </div>
          <div className="card-body grid grid-cols-2 sm:grid-cols-3 gap-3">
            {hasPermission(PERMISSIONS.USER_CREATE) && (
              <QuickAction to="/app/users" icon={Users} label="Manage Users" />
            )}
            {hasPermission(PERMISSIONS.QUESTION_CREATE) && (
              <QuickAction to="/app/questions" icon={FileQuestion} label="Add Question" />
            )}
            {hasPermission(PERMISSIONS.STUDENT_CREATE) && (
              <QuickAction to="/app/students" icon={GraduationCap} label="Register Student" />
            )}
            {hasPermission(PERMISSIONS.RESULT_ENTRY) && (
              <QuickAction to="/app/results/new" icon={FileSpreadsheet} label="Enter Result" />
            )}
            {hasPermission(PERMISSIONS.EXAM_CREATE) && (
              <QuickAction to="/app/exams/new" icon={ClipboardList} label="Create Exam" />
            )}
            <QuickAction to="/app/profile" icon={Shield} label="My Profile" />
          </div>
        </div>

        {/* Notifications preview */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary-600" />
              Recent Notifications
            </h2>
            <Link to="/app/notifications" className="text-xs text-primary-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="card-body p-0">
            {(notifData?.items ?? []).length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No notifications yet</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {(notifData?.items ?? []).map((n) => (
                  <li key={n.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <div className="flex items-start gap-2">
                      {!n.readAt && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-500 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{n.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity (super_admin / principal) */}
      {(user?.roles.includes('super_admin' as any) || user?.roles.includes('principal' as any)) && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary-600" />
              Recent Activity
            </h2>
            <Link to="/app/activity" className="text-xs text-primary-600 hover:underline">
              View full log →
            </Link>
          </div>
          <div className="card-body p-0">
            {(recentActivity ?? []).length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No activity yet</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {(recentActivity ?? []).map((a) => (
                  <li key={a.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-semibold">
                      {a.user ? `${a.user.firstName[0]}${a.user.lastName[0]}` : 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        <strong>{a.user ? `${a.user.firstName} ${a.user.lastName}` : 'System'}</strong>{' '}
                        <span className="text-gray-600 dark:text-gray-400">
                          {a.action.toLowerCase().replace(/_/g, ' ')}
                        </span>
                        {a.resource && (
                          <span className="font-mono text-gray-700 dark:text-gray-300"> {a.resource}</span>
                        )}
                      </p>
                      {a.description && (
                        <p className="text-xs text-gray-500 truncate">{a.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Build progress */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary-600" />
            Build Progress
          </h2>
        </div>
        <div className="card-body space-y-2">
          <PhaseItem done label="Phase 1: Monorepo, database schema, base UI" />
          <PhaseItem done label="Phase 2: Authentication (login, refresh, RBAC, users)" />
          <PhaseItem done label="Phase 3: Departments, programs, courses" />
          <PhaseItem done label="Phase 4: Student registration" />
          <PhaseItem done label="Phase 4.5: Mock mode + dark mode" />
          <PhaseItem done label="Phase 5: Question bank" />
          <PhaseItem done label="Phase 6: Exam generator" />
          <PhaseItem done label="Phase 7: Results management + transcripts" />
          <PhaseItem done label="Phase 8: Notifications, activity log, dashboard" />
          <PhaseItem label="Phase 9: Audit trail viewer, polish, deployment" />
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, loading, color, link }: any) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400',
    success: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400',
  };
  const content = (
    <div className="card p-4 hover:shadow-md transition-shadow h-full">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {loading ? '…' : value}
      </div>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

function QuickAction({ to, icon: Icon, label }: any) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:hover:border-primary-500/30 dark:hover:bg-primary-500/10 transition-colors"
    >
      <Icon className="h-6 w-6 text-primary-600" />
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">{label}</span>
    </Link>
  );
}

function PhaseItem({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${
          done ? 'bg-success-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
        }`}
      >
        {done ? '✓' : '○'}
      </div>
      <span className={done ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
        {label}
      </span>
    </div>
  );
}
