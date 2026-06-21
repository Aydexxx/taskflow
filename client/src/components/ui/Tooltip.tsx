import type { ReactNode } from 'react';
import { cn } from './cn';

interface TooltipProps {
  /** Text shown on hover/focus. Also set as a native `title` for assistive tech. */
  label: string;
  side?: 'top' | 'bottom';
  children: ReactNode;
  className?: string;
}

/**
 * Lightweight, dependency-free tooltip. The trigger is wrapped in a `group`, and
 * the bubble fades in on hover/focus-within via Tailwind transitions (so it's
 * automatically suppressed under prefers-reduced-motion). A native `title`
 * mirrors the label for screen readers and touch.
 */
export function Tooltip({ label, side = 'top', children, className }: TooltipProps): JSX.Element {
  return (
    <span className={cn('group relative inline-flex', className)} title={label}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 ' +
            'text-[11px] font-medium opacity-0 shadow-md transition-opacity duration-150 ease-out-soft ' +
            'group-hover:opacity-100 group-focus-within:opacity-100 ' +
            'bg-slate-900 text-slate-50 ring-1 ring-white/10 dark:bg-slate-700',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {label}
      </span>
    </span>
  );
}
