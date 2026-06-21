import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { User } from '@taskflow/shared';

// A mutable auth state the mocked `useAuth` reads, so each test can pose as
// logged-out / logged-in / still-restoring without re-mocking.
const { authState } = vi.hoisted(() => ({
  authState: {
    user: null as User | null,
    token: null as string | null,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('./context/AuthContext', () => ({
  useAuth: () => authState,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ThemeToggle (used by the landing header and auth layout) needs a theme context.
vi.mock('./context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' as const, toggleTheme: vi.fn(), setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// The authenticated home is irrelevant to routing assertions — stub it so we
// don't pull in its data fetching.
vi.mock('./pages/WorkspacesPage', () => ({
  WorkspacesPage: () => <div>Workspaces home</div>,
}));

// Other protected pages are imported statically by the route table; keep their
// socket/api modules inert during import.
vi.mock('./lib/socket', () => ({
  socket: { on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), auth: {} },
}));
vi.mock('./lib/api', () => ({
  api: {},
  ApiRequestError: class ApiRequestError extends Error {},
}));

import { AppRoutes } from './App';

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={null}>
        <AppRoutes />
      </Suspense>
    </MemoryRouter>,
  );
}

const fakeUser: User = {
  id: 'u1',
  name: 'Ada',
  email: 'ada@example.com',
  avatarUrl: null,
  title: null,
  bio: null,
  socialLinks: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  authState.user = null;
  authState.token = null;
  authState.isLoading = false;
});

describe('public landing route', () => {
  it('shows the marketing landing page at "/" for logged-out visitors', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: /moves together/i })).toBeInTheDocument();
    expect(screen.queryByText('Workspaces home')).not.toBeInTheDocument();
  });

  it('redirects authenticated users from "/" straight to the app', () => {
    authState.user = fakeUser;
    renderAt('/');
    expect(screen.getByText('Workspaces home')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /moves together/i })).not.toBeInTheDocument();
  });

  it('shows a neutral fallback (not the landing page) while the session is restoring', () => {
    authState.isLoading = true;
    renderAt('/');
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: /moves together/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Workspaces home')).not.toBeInTheDocument();
  });
});

describe('protected routes', () => {
  it('redirects logged-out visitors from "/app" to the login page', () => {
    renderAt('/app');
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByText('Workspaces home')).not.toBeInTheDocument();
  });

  it('renders the app home at "/app" for authenticated users', () => {
    authState.user = fakeUser;
    renderAt('/app');
    expect(screen.getByText('Workspaces home')).toBeInTheDocument();
  });
});
