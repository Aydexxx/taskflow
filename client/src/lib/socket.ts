import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@taskflow/shared';
import { config } from '../config';

/**
 * Typed Socket.IO client. The generic arguments are intentionally
 * reversed relative to the server: from the client's perspective it
 * *listens* for ServerToClientEvents and *emits* ClientToServerEvents.
 */
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Shared singleton socket instance for the app.
 *
 * The server rejects unauthenticated handshakes, so `autoConnect` is off —
 * `AuthContext` sets `socket.auth` and calls `connect()`/`disconnect()` as
 * the session changes.
 */
export const socket: TypedSocket = io(config.socketUrl, {
  autoConnect: false,
  transports: ['websocket'],
});
