const STORAGE_KEY = 'taskflow.token';

/**
 * Persists the access token in sessionStorage rather than localStorage: a
 * token stolen via XSS is then scoped to the current tab session and is
 * cleared when the tab closes, instead of persisting indefinitely on disk.
 */
export const tokenStorage = {
  get: (): string | null => sessionStorage.getItem(STORAGE_KEY),
  set: (token: string): void => sessionStorage.setItem(STORAGE_KEY, token),
  clear: (): void => sessionStorage.removeItem(STORAGE_KEY),
};
