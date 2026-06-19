/**
 * Socket.IO event contract shared by server and client.
 *
 * Both ends import these interfaces to type their Socket.IO instances, so the
 * realtime channel is checked at compile time end to end.
 */

import type { ActivityWithActor, Card, Column, CommentWithAuthor } from './models';

/** Canonical event name constants (avoid magic strings on either side). */
export const SOCKET_EVENTS = {
  PING: 'ping',
  PONG: 'pong',
  // Board room membership (client -> server).
  BOARD_JOIN: 'board:join',
  BOARD_LEAVE: 'board:leave',
  PRESENCE_EDITING: 'board:presence:editing',
  // Board mutation broadcasts (server -> room).
  CARD_CREATED: 'board:card:created',
  CARD_UPDATED: 'board:card:updated',
  CARD_MOVED: 'board:card:moved',
  CARD_DELETED: 'board:card:deleted',
  COLUMN_CREATED: 'board:column:created',
  COLUMN_UPDATED: 'board:column:updated',
  COLUMN_DELETED: 'board:column:deleted',
  // Comment + activity broadcasts (server -> room). Card label/assignee/priority
  // changes are NOT separate events: they reuse CARD_UPDATED with the full card.
  COMMENT_CREATED: 'board:comment:created',
  COMMENT_DELETED: 'board:comment:deleted',
  ACTIVITY_CREATED: 'board:activity:created',
  // Presence (server -> room).
  PRESENCE_SYNC: 'board:presence:sync',
} as const;

/** The Socket.IO room a board's collaborators share. Used identically on both ends. */
export function boardRoom(boardId: string): string {
  return `board:${boardId}`;
}

/** Payload the client sends with a "ping". */
export interface PingPayload {
  /** Optional human-readable note. */
  message?: string;
  /** Client clock (ms epoch) at send time, echoed back for round-trip timing. */
  sentAt: number;
}

/** Payload the server broadcasts with a "pong". */
export interface PongPayload {
  message: string;
  /** Server timestamp as ISO-8601 string. */
  serverTime: string;
  /** The client `sentAt` value echoed back so the client can compute latency. */
  echoedSentAt: number;
}

/**
 * Common fields on every board mutation broadcast.
 *
 * `actorId` is the user whose action produced the event. The client uses it for
 * attribution/presence; correctness does NOT depend on filtering by it, because
 * every reducer is idempotent by entity id (see the client's board event reducer).
 */
export interface BoardEventBase {
  boardId: string;
  actorId: string;
}

/** A card was created or updated; carries the full authoritative card. */
export interface CardEvent extends BoardEventBase {
  card: Card;
}

/** A card was moved within or across columns; carries the card with its new column/position. */
export interface CardMovedEvent extends BoardEventBase {
  card: Card;
}

/** A card was deleted. */
export interface CardDeletedEvent extends BoardEventBase {
  cardId: string;
  columnId: string;
}

/** A column was created or updated; carries the full authoritative column. */
export interface ColumnEvent extends BoardEventBase {
  column: Column;
}

/** A column (and its cards) was deleted. */
export interface ColumnDeletedEvent extends BoardEventBase {
  columnId: string;
}

/** A comment was added to a card. */
export interface CommentEvent extends BoardEventBase {
  cardId: string;
  comment: CommentWithAuthor;
}

/** A comment was deleted from a card. */
export interface CommentDeletedEvent extends BoardEventBase {
  cardId: string;
  commentId: string;
}

/** A new entry was recorded on the board's activity feed. */
export interface ActivityCreatedEvent extends BoardEventBase {
  activity: ActivityWithActor;
}

/** A collaborator currently viewing a board (de-duplicated by user for display). */
export interface PresenceUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** Id of the card this user is currently editing on the board, if any. */
  editingCardId: string | null;
}

/** Full presence snapshot for a board, broadcast on every join/leave/editing change. */
export interface PresenceSyncEvent {
  boardId: string;
  users: PresenceUser[];
}

/** Client -> server: request to join a board room (server authorizes membership). */
export interface BoardJoinPayload {
  boardId: string;
}

/** Client -> server: leave a board room. */
export interface BoardLeavePayload {
  boardId: string;
}

/** Client -> server: announce which card (if any) the user is editing. */
export interface PresenceEditingPayload {
  boardId: string;
  cardId: string | null;
}

/** Acknowledgement returned to the client after a `board:join` attempt. */
export type BoardJoinResult = { ok: true } | { ok: false; error: string };

/** Events the server emits to clients. */
export interface ServerToClientEvents {
  pong: (payload: PongPayload) => void;
  'board:card:created': (payload: CardEvent) => void;
  'board:card:updated': (payload: CardEvent) => void;
  'board:card:moved': (payload: CardMovedEvent) => void;
  'board:card:deleted': (payload: CardDeletedEvent) => void;
  'board:column:created': (payload: ColumnEvent) => void;
  'board:column:updated': (payload: ColumnEvent) => void;
  'board:column:deleted': (payload: ColumnDeletedEvent) => void;
  'board:comment:created': (payload: CommentEvent) => void;
  'board:comment:deleted': (payload: CommentDeletedEvent) => void;
  'board:activity:created': (payload: ActivityCreatedEvent) => void;
  'board:presence:sync': (payload: PresenceSyncEvent) => void;
}

/** Events clients emit to the server. */
export interface ClientToServerEvents {
  ping: (payload: PingPayload) => void;
  'board:join': (payload: BoardJoinPayload, ack: (result: BoardJoinResult) => void) => void;
  'board:leave': (payload: BoardLeavePayload) => void;
  'board:presence:editing': (payload: PresenceEditingPayload) => void;
}

/** Server-to-server events (unused for now; reserved for scaling/adapters). */
export type InterServerEvents = Record<string, never>;

/** Per-socket data attached on the server after the auth handshake. */
export interface SocketData {
  userId?: string;
  /** Cached from the handshake so presence broadcasts need no extra DB lookup. */
  userName?: string;
  userAvatarUrl?: string | null;
}

/** Handshake `auth` payload the client sends when connecting (see `socket.handshake.auth`). */
export interface SocketAuthPayload {
  token: string;
}
