import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons must be labelled for assistive tech. */
  'aria-label': string;
  active?: boolean;
  children: ReactNode;
}

/** Square, icon-only button with a consistent hover/active treatment. */
export function IconButton({ active = false, className, children, ...rest }: IconButtonProps): JSX.Element {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        active
          ? 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300'
          : 'border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800',
        className,
      )}
    >
      {children}
    </button>
  );
}
