import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const PANEL_POINTS = ['Real-time collaboration', 'Drag-and-drop boards', 'Roles, AI assist & analytics'];

/**
 * Split layout shared by the login and register pages: a branded gradient panel
 * on the left (desktop only) and the form card on the right. The API is
 * unchanged from the simpler card layout, so the auth pages didn't need edits.
 */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps): JSX.Element {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Branded panel — decorative + reassuring, hidden on small screens. */}
      <aside className="relative hidden w-[44%] max-w-xl overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />

        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-sm font-bold tracking-tight text-white ring-1 ring-inset ring-white/25 backdrop-blur">
            TF
          </span>
          <span className="text-base font-semibold tracking-tight text-white">TaskFlow</span>
        </Link>

        <div className="relative">
          <h2 className="max-w-sm text-3xl font-bold leading-tight tracking-tight text-white">
            Where your team’s work moves together.
          </h2>
          <ul className="mt-8 space-y-3">
            {PANEL_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-indigo-50">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-inset ring-white/30">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-sm font-medium">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-indigo-200/80">Real-time Kanban for fast teams.</p>
      </aside>

      {/* Form side */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12">
        <Link
          to="/"
          className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm animate-scale-in">
          {/* Compact brand mark for mobile, where the panel is hidden. */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold tracking-tight text-white shadow-sm ring-1 ring-inset ring-white/15">
              TF
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-500 dark:text-slate-400">TaskFlow</span>
          </div>

          <h1 className="text-h2 text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
