/** Centralized, typed access to client runtime configuration. */
export const config = {
  /** Backend HTTP API base URL. */
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  /** Socket.IO server base URL. */
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000',
} as const;
