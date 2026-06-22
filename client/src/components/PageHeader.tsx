import type { ReactNode } from 'react';
import { cn } from './ui/cn';

interface PageHeaderProps {
  /** Optional pill/eyebrow above the title (e.g. a count or context badge). */
  eyebrow?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  /** Primary action(s), shown to the right on wider screens. */
  actions?: ReactNode;
  className?: string;
}

/**
 * The in-body page header pattern shared across app pages: an optional eyebrow,
 * a confident display title, a supporting subtitle, and a primary-action slot —
 * the same editorial hierarchy as the marketing page, brought inside the app.
 */
export function PageHeader({ eyebrow, title, subtitle, actions, className }: PageHeaderProps): JSX.Element {
  return (
    <div className={cn('flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow && <div className="mb-3 flex items-center gap-2">{eyebrow}</div>}
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {title}
        </h1>
        {subtitle && <p className="mt-2.5 text-base leading-relaxed text-slate-600 dark:text-slate-300">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
