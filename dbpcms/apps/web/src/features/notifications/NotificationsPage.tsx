/**
 * Notifications page — full history of all your notifications.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox, CheckCheck, Trash2, Filter, Check, Bell, Loader2,
} from 'lucide-react';
import {
  useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification,
} from '@/hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data, isLoading } = useNotifications({
    unreadOnly: filter === 'unread',
    pageSize: 100,
  });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const del = useDeleteNotification();

  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} unread of ${total} total` : `${total} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={() => markAll.mutate()} disabled={markAll.isPending} className="btn-secondary">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="card p-2 flex items-center gap-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded text-sm font-medium ${filter === 'all' ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <Bell className="h-3.5 w-3.5 inline mr-1" /> All ({total})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded text-sm font-medium ${filter === 'unread' ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <Filter className="h-3.5 w-3.5 inline mr-1" /> Unread ({unreadCount})
        </button>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Inbox className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-sm mt-1">You're all caught up! 🎉</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            <AnimatePresence>
              {items.map((n) => (
                <motion.li
                  key={n.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`group p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                    !n.readAt ? 'bg-primary-50/30 dark:bg-primary-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!n.readAt && (
                      <span className="mt-2 h-2 w-2 rounded-full bg-primary-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.readAt ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-gray-100`}>
                        {n.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{n.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs text-gray-400">{timeAgo(n.createdAt)}</p>
                        {n.type && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            {n.type.toLowerCase().replace(/_/g, ' ')}
                          </span>
                        )}
                        {n.data?.resultId && (
                          <Link
                            to={`/app/results/${n.data.resultId}`}
                            className="text-xs text-primary-600 hover:underline"
                          >
                            View result →
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.readAt && (
                        <button
                          onClick={() => markRead.mutate(n.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-success-600 hover:bg-success-50"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => del.mutate(n.id)}
                        className="p-1.5 rounded text-gray-400 hover:text-danger-600 hover:bg-danger-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
