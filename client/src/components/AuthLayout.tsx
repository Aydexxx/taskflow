import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Centered card layout shared by the login and register pages. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps): JSX.Element {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm animate-scale-in dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            TF
          </span>
          <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">TaskFlow</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
