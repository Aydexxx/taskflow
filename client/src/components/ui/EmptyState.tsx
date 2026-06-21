import type { ReactNode } from 'react';
import { cn } from './cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Friendly placeholder for empty lists, with an optional icon and call-to-action. */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center shadow-soft dark:border-slate-700 dark:bg-slate-900/40',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
