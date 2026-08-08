/**
 * Activity Log Page — full audit trail.
 * Only super_admin and principal can view this.
 */

import { useState } from 'react';
import {
  Search, Filter, Loader2, History, Shield, Activity as ActivityIcon,
  CheckCircle2, XCircle, Edit2, Trash2, User, FileQuestion, FileText,
  UserPlus, LogIn, LogOut, AlertCircle, Database, Bell,
} from 'lucide-react';
import { useActivity, useActivityStats, type ActivityEntry } from '@/hooks/useActivity';
import { motion } from 'framer-motion';

const ACTION_ICONS: Record<string, any> = {
  CREATE: Edit2,
  UPDATE: Edit2,
  DELETE: Trash2,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  LOGIN_FAILED: AlertCircle,
  APPROVE: CheckCircle2,
  REJECT: XCircle,
  VERIFY: Shield,
  AUTHORIZE: Shield,
  PUBLISH: CheckCircle2,
  PASSWORD_CHANGE: Shield,
  PASSWORD_RESET_REQUEST: Shield,
  PASSWORD_RESET_COMPLETE: Shield,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400',
  UPDATE: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400',
  DELETE: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400',
  LOGIN: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
  LOGOUT: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  APPROVE: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
  REJECT: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400',
  VERIFY: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400',
  AUTHORIZE: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400',
  PUBLISH: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
};

const RESOURCE_ICONS: Record<string, any> = {
  student: UserPlus,
  user: User,
  question: FileQuestion,
  result: FileText,
  exam: FileText,
  notification: Bell,
  department: Database,
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ActivityLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  const { data, isLoading } = useActivity({
    page, pageSize: 30,
    action: actionFilter || undefined,
    resource: resourceFilter || undefined,
  });
  const { data: stats } = useActivityStats();

  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <History className="h-6 w-6 text-primary-600" />
          Activity Log
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Complete audit trail of all system actions. {total} entries.
        </p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Last 7 days</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            <div className="text-xs text-gray-500">total events</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Top action</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.byAction[0]?.action || '—'}
            </div>
            <div className="text-xs text-gray-500">{stats.byAction[0]?.count || 0} events</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Top user</div>
            <div className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
              {stats.topUsers[0]?.user
                ? `${stats.topUsers[0].user.firstName} ${stats.topUsers[0].user.lastName}`
                : '—'}
            </div>
            <div className="text-xs text-gray-500">{stats.topUsers[0]?.count || 0} events</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="form-input sm:w-48"
        >
          <option value="">All actions</option>
          {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'VERIFY', 'AUTHORIZE', 'PUBLISH'].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={resourceFilter}
          onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
          className="form-input sm:w-48"
        >
          <option value="">All resources</option>
          {['student', 'user', 'question', 'result', 'exam', 'department', 'notification'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <div className="flex-1 text-right text-sm text-gray-500 self-center">
          {total} {total === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      {/* Timeline */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading activity…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ActivityIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No activity yet</p>
            <p className="text-sm mt-1">As users perform actions, they'll show up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((entry: ActivityEntry) => {
              const ActionIcon = ACTION_ICONS[entry.action] || ActivityIcon;
              const ResourceIcon = RESOURCE_ICONS[entry.resource || ''] || Database;
              const colorClass = ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
              return (
                <motion.li
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <ActionIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System'}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {entry.action.toLowerCase().replace(/_/g, ' ')}
                        </span>
                        {entry.resource && (
                          <>
                            <ResourceIcon className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{entry.resource}</span>
                          </>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{entry.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>{timeAgo(entry.createdAt)}</span>
                        {entry.ipAddress && <span>· {entry.ipAddress}</span>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-400 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-sm"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
