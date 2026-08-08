/**
 * Beautiful empty states with illustrations.
 * Used everywhere instead of plain "No data" text.
 */

import { ReactNode } from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="relative">
        <div className="absolute inset-0 bg-primary-100 dark:bg-primary-500/10 rounded-full blur-2xl opacity-60" />
        <div className="relative h-20 w-20 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
          <Icon className="h-10 w-10 text-primary-400 dark:text-primary-500" />
        </div>
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 max-w-md">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
      {action && (
        action.to ? (
          <Link to={action.to} className="btn-primary mt-5">
            {action.label}
          </Link>
        ) : (
          <button onClick={action.onClick} className="btn-primary mt-5">
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
