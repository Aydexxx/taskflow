import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import {
  SOCKET_EVENTS,
  boardRoom,
  userRoom,
  workspaceRoom,
  type BoardJoinPayload,
  type BoardJoinResult,
  type BoardLeavePayload,
  type ClientToServerEvents,
  type InterServerEvents,
  type PingPayload,
  type PongPayload,
  type PresenceEditingPayload,
  type ServerToClientEvents,
  type SocketAuthPayload,
  type SocketData,
  type WorkspaceJoinPayload,
  type WorkspaceJoinResult,
  type WorkspaceLeavePayload,
} from '@taskflow/shared';
import { env } from '../config/env';
import { verifyAccessToken } from '../services/jwt';
import { prisma } from '../services/prisma';
import { getMembership, resolveBoardWorkspaceId } from '../services/authorization';
import { boardBus } from '../events/boardBus';
import { workspaceBus } from '../events/workspaceBus';
import { notificationBus } from '../events/notificationBus';
import { PresenceRegistry } from './presence';

/** Strongly-typed Socket.IO server bound to the shared event contract. */
export type TypedSocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Attach a typed Socket.IO server to an existing HTTP server: authenticate the
 * handshake, manage per-board rooms with presence, and fan board mutations out
 * to each board's room.
 */
export function createSocketServer(httpServer: HttpServer): TypedSocketServer {
  const io: TypedSocketServer = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  const presence = new PresenceRegistry();

  const broadcastPresence = (boardId: string): void => {
    io.to(boardRoom(boardId)).emit(SOCKET_EVENTS.PRESENCE_SYNC, {
      boardId,
      users: presence.listForBoard(boardId),
    });
  };

  // Reject the handshake unless the client presents a valid access token.
  io.use(async (socket, next) => {
    const { token } = (socket.handshake.auth ?? {}) as Partial<SocketAuthPayload>;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        next(new Error('User no longer exists'));
        return;
      }
      socket.data.userId = user.id;
      socket.data.userName = user.name;
      socket.data.userAvatarUrl = user.avatarUrl;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // eslint-disable-next-line no-console
    console.log(`[socket] connected: ${socket.id}`);

    // Every authenticated socket automatically joins its own personal room, so
    // notifications reach the user regardless of which board/workspace (if
    // any) they currently have open — no client-initiated join, unlike board
    // and workspace rooms which require membership authorization.
    void socket.join(userRoom(socket.data.userId as string));

    socket.on(SOCKET_EVENTS.PING, (payload: PingPayload) => {
      const response: PongPayload = {
        message: payload.message ? `pong: ${payload.message}` : 'pong',
        serverTime: new Date().toISOString(),
        echoedSentAt: payload.sentAt,
      };
      io.emit(SOCKET_EVENTS.PONG, response);
    });

    // Join a board room — only workspace members are admitted.
    socket.on(SOCKET_EVENTS.BOARD_JOIN, async ({ boardId }: BoardJoinPayload, ack) => {
      const respond = (result: BoardJoinResult): void => ack?.(result);
      const userId = socket.data.userId;
      if (!userId) {
        respond({ ok: false, error: 'Not authenticated' });
        return;
      }
      try {
        const workspaceId = await resolveBoardWorkspaceId(boardId);
        const membership = await getMembership(workspaceId, userId);
        if (!membership) {
          respond({ ok: false, error: 'You are not a member of this board' });
          return;
        }
        await socket.join(boardRoom(boardId));
        presence.join({
          socketId: socket.id,
          boardId,
          userId,
          name: socket.data.userName ?? 'Unknown',
          avatarUrl: socket.data.userAvatarUrl ?? null,
          editingCardId: null,
        });
        respond({ ok: true });
        broadcastPresence(boardId);
      } catch (error) {
        respond({ ok: false, error: error instanceof Error ? error.message : 'Failed to join board' });
      }
    });

    socket.on(SOCKET_EVENTS.BOARD_LEAVE, ({ boardId }: BoardLeavePayload) => {
      void socket.leave(boardRoom(boardId));
      if (presence.leave(socket.id, boardId)) broadcastPresence(boardId);
    });

    // Join a workspace room — only workspace members are admitted. Used to
    // receive membership/role-change broadcasts regardless of which board (if
    // any) the client is currently viewing.
    socket.on(SOCKET_EVENTS.WORKSPACE_JOIN, async ({ workspaceId }: WorkspaceJoinPayload, ack) => {
      const respond = (result: WorkspaceJoinResult): void => ack?.(result);
      const userId = socket.data.userId;
      if (!userId) {
        respond({ ok: false, error: 'Not authenticated' });
        return;
      }
      try {
        const membership = await getMembership(workspaceId, userId);
        if (!membership) {
          respond({ ok: false, error: 'You are not a member of this workspace' });
          return;
        }
        await socket.join(workspaceRoom(workspaceId));
        respond({ ok: true });
      } catch (error) {
        respond({ ok: false, error: error instanceof Error ? error.message : 'Failed to join workspace' });
      }
    });

    socket.on(SOCKET_EVENTS.WORKSPACE_LEAVE, ({ workspaceId }: WorkspaceLeavePayload) => {
      void socket.leave(workspaceRoom(workspaceId));
    });

    socket.on(SOCKET_EVENTS.PRESENCE_EDITING, ({ boardId, cardId }: PresenceEditingPayload) => {
      if (presence.setEditing(socket.id, boardId, cardId)) broadcastPresence(boardId);
    });

    socket.on('disconnect', (reason) => {
      // eslint-disable-next-line no-console
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
      for (const boardId of presence.removeSocket(socket.id)) broadcastPresence(boardId);
    });
  });

  // Fan service-layer board mutations out to the matching board room.
  const unbindBoardBus = bindBoardBus(io);
  const unbindWorkspaceBus = bindWorkspaceBus(io);
  const unbindNotificationBus = bindNotificationBus(io);

  // Tear down bus subscriptions when the server closes (keeps tests leak-free).
  const close = io.close.bind(io);
  io.close = ((callback?: (err?: Error) => void) => {
    unbindBoardBus();
    unbindWorkspaceBus();
    unbindNotificationBus();
    return close(callback);
  }) as typeof io.close;

  return io;
}

/** Subscribe the socket server to the board event bus; returns an unsubscribe. */
function bindBoardBus(io: TypedSocketServer): () => void {
  const unsubscribers = [
    boardBus.subscribe('card:created', (p) => io.to(boardRoom(p.boardId)).emit(SOCKET_EVENTS.CARD_CREATED, p)),
    boardBus.subscribe('card:updated', (p) => io.to(boardRoom(p.boardId)).emit(SOCKET_EVENTS.CARD_UPDATED, p)),
    boardBus.subscribe('card:moved', (p) => io.to(boardRoom(p.boardId)).emit(SOCKET_EVENTS.CARD_MOVED, p)),
    boardBus.subscribe('card:deleted', (p) => io.to(boardRoom(p.boardId)).emit(SOCKET_EVENTS.CARD_DELETED, p)),
    boardBus.subscribe('column:created', (p) => io.to(boardRoom(p.boardId)).emit(SOCKET_EVENTS.COLUMN_CREATED, p)),
    boardBus.subscribe('column:updated', (p) => io.to(boardRoom(p.boardId)).emit(SOCKET_EVENTS.COLUMN_UPDATED, p)),
    boardBus.subscribe('column:deleted', (p) => io.to(boardRoom(p.boardId)).emit(SOCKET_EVENTS.COLUMN_DELETED, p)),
    boardBus.subscribe('comment:created', (p) => io.to(boardRoom(p.boardId)).emit(SOCKET_EVENTS.COMMENT_CREATED, p)),
    boardBus.subscribe('comment:deleted', (p) => io.to(boardRoom(p.boardId)).emit(SOCKET_EVENTS.COMMENT_DELETED, p)),
    boardBus.subscribe('activity:created', (p) => io.to(boardRoom(p.boardId)).emit(SOCKET_EVENTS.ACTIVITY_CREATED, p)),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

/** Subscribe the socket server to the workspace event bus; returns an unsubscribe. */
function bindWorkspaceBus(io: TypedSocketServer): () => void {
  const unsubscribers = [
    workspaceBus.subscribe('member:added', (p) =>
      io.to(workspaceRoom(p.workspaceId)).emit(SOCKET_EVENTS.WORKSPACE_MEMBER_ADDED, p),
    ),
    workspaceBus.subscribe('member:updated', (p) =>
      io.to(workspaceRoom(p.workspaceId)).emit(SOCKET_EVENTS.WORKSPACE_MEMBER_UPDATED, p),
    ),
    workspaceBus.subscribe('member:removed', (p) =>
      io.to(workspaceRoom(p.workspaceId)).emit(SOCKET_EVENTS.WORKSPACE_MEMBER_REMOVED, p),
    ),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

/** Subscribe the socket server to the notification event bus; returns an unsubscribe. */
function bindNotificationBus(io: TypedSocketServer): () => void {
  const unsubscribe = notificationBus.subscribe('notification:created', (p) =>
    io.to(userRoom(p.userId)).emit(SOCKET_EVENTS.NOTIFICATION_CREATED, { notification: p.notification }),
  );
  return unsubscribe;
}
