/**
 * Notification bell — sits in the topbar.
 * Shows a badge with unread count and a dropdown with the most recent notifications.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, X, Inbox } from 'lucide-react';
import {
  useNotifications, useUnreadNotificationCount, useMarkNotificationRead,
  useMarkAllNotificationsRead, useDeleteNotification,
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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: unread } = useUnreadNotificationCount();
  const { data: notifData } = useNotifications({ pageSize: 8 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const del = useDeleteNotification();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const notifications = notifData?.items ?? [];
  const unreadCount = unread ?? 0;

  const handleClick = async (id: string, data: any) => {
    if (!id) return;
    try { await markRead.mutateAsync(id); } catch {}
    if (data?.resultId) {
      navigate(`/app/results/${data.resultId}`);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] card overflow-hidden z-50 shadow-xl"
          >
            {/* Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                <p className="text-xs text-gray-500">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAll.mutate()}
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1 px-2 py-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Inbox className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`group p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors ${
                        !n.readAt ? 'bg-primary-50/30 dark:bg-primary-500/5' : ''
                      }`}
                      onClick={() => handleClick(n.id, n.data)}
                    >
                      <div className="flex items-start gap-2">
                        {!n.readAt && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.readAt ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-gray-100`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            del.mutate(n.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-danger-500 transition-opacity"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-center">
              <Link
                to="/app/notifications"
                onClick={() => setOpen(false)}
                className="text-sm text-primary-600 hover:underline"
              >
                View all notifications →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
