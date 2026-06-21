import type { ReactNode } from 'react';
import { cn } from './cn';

export type AlertTone = 'info' | 'success' | 'warn' | 'danger';

interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
  /** When provided, renders a dismiss control. */
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

const TONES: Record<AlertTone, string> = {
  info: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  warn: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
};

/** Inline message banner with semantic tones and an optional dismiss action. */
export function Alert({ tone = 'info', children, onDismiss, dismissLabel = 'Dismiss', className }: AlertProps): JSX.Element {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-soft',
        TONES[tone],
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 rounded font-medium underline-offset-2 transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          {dismissLabel}
        </button>
      )}
    </div>
  );
}
