import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LoginRequest, RegisterRequest, User } from '@taskflow/shared';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { tokenStorage } from '../lib/tokenStorage';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  /** True while restoring a persisted session on first load. */
  isLoading: boolean;
  login: (input: LoginRequest) => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const applySession = useCallback((nextToken: string, nextUser: User): void => {
    tokenStorage.set(nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback((): void => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  // Keep the Socket.IO connection's auth in sync with the current session.
  useEffect(() => {
    socket.auth = { token: token ?? '' };
    if (token) {
      socket.connect();
    } else {
      socket.disconnect();
    }
  }, [token]);

  // On first load, try to restore a session from a persisted token.
  useEffect(() => {
    const persistedToken = tokenStorage.get();
    if (!persistedToken) {
      setIsLoading(false);
      return;
    }
    api
      .me()
      .then((restoredUser) => {
        setToken(persistedToken);
        setUser(restoredUser);
      })
      .catch(() => {
        tokenStorage.clear();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (input: LoginRequest): Promise<void> => {
      const result = await api.login(input);
      applySession(result.token, result.user);
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterRequest): Promise<void> => {
      const result = await api.register(input);
      applySession(result.token, result.user);
    },
    [applySession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
