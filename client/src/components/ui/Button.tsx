import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button while an action is in flight. */
  isLoading?: boolean;
  children: ReactNode;
}

// Shared interaction language: a subtle hover lift, a crisp press, an accent
// focus ring, and a soft-ease transition. `disabled`/`active` opt out of the lift.
const BASE =
  'inline-flex select-none items-center justify-center gap-2 rounded-lg font-medium transition duration-150 ease-out-soft ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ' +
  'active:translate-y-px active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ' +
  'disabled:active:translate-y-0 disabled:active:scale-100 disabled:shadow-none';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 hover:shadow active:bg-indigo-700 ' +
    'dark:shadow-none dark:hover:bg-indigo-500',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:shadow ' +
    'active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:shadow-none ' +
    'dark:hover:bg-slate-700 dark:active:bg-slate-700/70',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-500 hover:shadow active:bg-red-700 dark:shadow-none',
  ghost:
    'text-slate-600 hover:bg-slate-100 active:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800 ' +
    'dark:active:bg-slate-700/70',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

/** Themed button with consistent variants, sizes, focus ring, and a loading state. */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      {...rest}
      disabled={disabled || isLoading}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
    >
      {isLoading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
