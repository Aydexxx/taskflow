import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Render in a monospace face — handy for ids, counts, and codes. */
  mono?: boolean;
  children: ReactNode;
}

const TONES: Record<BadgeTone, string> = {
  neutral:
    'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  accent:
    'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30',
  success:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
  warn: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  danger: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30',
};

/** Small label/count chip with semantic tones and a consistent ring. */
export function Badge({ tone = 'neutral', mono = false, className, children, ...rest }: BadgeProps): JSX.Element {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 ring-1 ring-inset',
        mono && 'font-mono tabular-nums',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
