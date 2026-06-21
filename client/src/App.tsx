import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Spinner } from './components/ui';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { WorkspaceBoardsPage } from './pages/WorkspaceBoardsPage';
import { WorkspaceMembersPage } from './pages/WorkspaceMembersPage';
import { BoardPage } from './pages/BoardPage';
import { ProfilePage } from './pages/ProfilePage';

// Code-split the analytics dashboard: it pulls in the (heavy) charting library,
// which only needs to load when a user actually opens analytics.
const BoardAnalyticsPage = lazy(() =>
  import('./pages/BoardAnalyticsPage').then((module) => ({ default: module.BoardAnalyticsPage })),
);

function RouteFallback(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950" role="status">
      <Spinner className="h-6 w-6 text-indigo-500" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * The index route ("/"). Logged-out visitors get the marketing landing page;
 * authenticated users skip straight to the app. While the persisted session is
 * still being restored we show a neutral fallback rather than flashing the
 * landing page and then redirecting.
 */
function HomeRoute(): JSX.Element {
  const { user, isLoading } = useAuth();
  if (isLoading) return <RouteFallback />;
  if (user) return <Navigate to="/app" replace />;
  return <LandingPage />;
}

/** Route table, separated from the providers so it can be exercised in tests. */
export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<WorkspacesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/workspaces/:workspaceId" element={<WorkspaceBoardsPage />} />
        <Route path="/workspaces/:workspaceId/members" element={<WorkspaceMembersPage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="/boards/:boardId/analytics" element={<BoardAnalyticsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
