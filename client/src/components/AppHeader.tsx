import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

interface AppHeaderProps {
  title: string;
  backTo?: { to: string; label: string };
  /** Optional slot rendered between the title and the user controls (e.g. presence). */
  actions?: ReactNode;
}

/** Shared top bar for the workspace/board navigation pages. */
export function AppHeader({ title, backTo, actions }: AppHeaderProps): JSX.Element {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-6 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 dark:border-slate-800/80 dark:bg-slate-900/80 dark:supports-[backdrop-filter]:bg-slate-900/70">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold tracking-tight text-white shadow-sm ring-1 ring-inset ring-white/15 sm:flex"
        >
          TF
        </span>
        <div className="min-w-0">
          {backTo && (
            <Link
              to={backTo.to}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              <span aria-hidden="true">←</span> {backTo.label}
            </Link>
          )}
          <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {actions}
        <div className="mx-0.5 hidden h-6 w-px bg-slate-200 dark:bg-slate-700/80 sm:block" />
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

/**
 * The header avatar control: a button that opens a small profile summary
 * (avatar, name, title, email) with a link to edit the profile and a log-out
 * action. Closes on outside click or Escape.
 */
function UserMenu(): JSX.Element | null {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 py-1 pl-1 pr-2 text-sm font-medium text-slate-600 transition duration-150 ease-out-soft hover:border-slate-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 sm:pr-3"
      >
        <Avatar name={user.name} avatarUrl={user.avatarUrl} />
        <span className="hidden max-w-[10rem] truncate sm:inline">{user.name}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ease-out-soft sm:block ${open ? 'rotate-180' : ''}`}
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-full z-40 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-overlay ring-1 ring-slate-900/[0.04] motion-safe:animate-slide-in-down dark:border-slate-700 dark:bg-slate-900 dark:ring-0"
        >
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={user.name} avatarUrl={user.avatarUrl} className="h-10 w-10 !text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
              {user.title && (
                <p className="truncate text-xs text-indigo-600 dark:text-indigo-400">{user.title}</p>
              )}
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
          <Link
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 focus:outline-none focus-visible:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
          >
            Edit profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="block w-full rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 focus:outline-none focus-visible:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
