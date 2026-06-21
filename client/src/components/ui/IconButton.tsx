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
        'inline-flex items-center justify-center rounded-lg border p-2 transition duration-150 ease-out-soft ' +
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
          'focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 active:scale-95',
        active
          ? 'border-indigo-300 bg-indigo-50 text-indigo-600 shadow-soft dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300 dark:shadow-none'
          : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200',
        className,
      )}
    >
      {children}
    </button>
  );
}
