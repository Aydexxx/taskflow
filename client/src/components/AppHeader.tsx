import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui';

interface AppHeaderProps {
  title: string;
  backTo?: { to: string; label: string };
  /** Optional slot rendered between the title and the user controls (e.g. presence). */
  actions?: ReactNode;
}

/** Shared top bar for the workspace/board navigation pages. */
export function AppHeader({ title, backTo, actions }: AppHeaderProps): JSX.Element {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo.to}
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            ← {backTo.label}
          </Link>
        )}
        <h1 className="truncate text-xl font-bold text-slate-900 dark:text-slate-50">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <NotificationBell />
        <ThemeToggle />
        <div className="hidden items-center gap-2 sm:flex">
          {user && <Avatar name={user.name} />}
          <span className="max-w-[10rem] truncate text-sm text-slate-500 dark:text-slate-400">{user?.name}</span>
        </div>
        <Button variant="secondary" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
