import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AssistantWidget } from './ai/AssistantWidget';
import { Spinner } from './ui';

/** Renders nested routes only for an authenticated user; otherwise redirects to /login. */
export function ProtectedRoute(): JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-slate-100 text-slate-400 dark:bg-slate-950 dark:text-slate-500">
        <Spinner className="h-5 w-5" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Mount the global AI assistant once for every authenticated page. It gates
  // itself on `health().ai.enabled` and renders nothing when AI is disabled.
  return (
    <>
      <Outlet />
      <AssistantWidget />
    </>
  );
}
