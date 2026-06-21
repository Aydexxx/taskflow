/**
 * Socket.IO event contract shared by server and client.
 *
 * Both ends import these interfaces to type their Socket.IO instances, so the
 * realtime channel is checked at compile time end to end.
 */

import type { ActivityWithActor, Card, Column, CommentWithAuthor, NotificationWithActor } from './models';
import type { WorkspaceMemberWithUser } from './api';

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
  // Workspace room membership (client -> server).
  WORKSPACE_JOIN: 'workspace:join',
  WORKSPACE_LEAVE: 'workspace:leave',
  // Membership/role change broadcasts (server -> room).
  WORKSPACE_MEMBER_ADDED: 'workspace:member:added',
  WORKSPACE_MEMBER_UPDATED: 'workspace:member:updated',
  WORKSPACE_MEMBER_REMOVED: 'workspace:member:removed',
  // Notifications (server -> the recipient's personal room only).
  NOTIFICATION_CREATED: 'notification:created',
} as const;

/** The Socket.IO room a board's collaborators share. Used identically on both ends. */
export function boardRoom(boardId: string): string {
  return `board:${boardId}`;
}

/** The Socket.IO room a workspace's members share, for membership/role broadcasts. */
export function workspaceRoom(workspaceId: string): string {
  return `workspace:${workspaceId}`;
}

/**
 * The Socket.IO room private to one user, used for notification delivery.
 * Every authenticated socket joins its own user room automatically on
 * connect (see `createSocketServer`) — there is no client-initiated join,
 * since a user always wants their own notifications regardless of which
 * board/workspace (if any) they currently have open.
 */
export function userRoom(userId: string): string {
  return `user:${userId}`;
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

/** Common fields on every workspace membership broadcast. */
export interface WorkspaceEventBase {
  workspaceId: string;
  actorId: string;
}

/** A member was added or had their role changed; carries the full member-with-user view. */
export interface WorkspaceMemberEvent extends WorkspaceEventBase {
  member: WorkspaceMemberWithUser;
}

/** A member was removed from the workspace. */
export interface WorkspaceMemberRemovedEvent extends WorkspaceEventBase {
  userId: string;
}

/** A notification was created for the recipient currently subscribed to this event (their own user room). */
export interface NotificationCreatedEvent {
  notification: NotificationWithActor;
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

/** Client -> server: request to join a workspace room (server authorizes membership). */
export interface WorkspaceJoinPayload {
  workspaceId: string;
}

/** Client -> server: leave a workspace room. */
export interface WorkspaceLeavePayload {
  workspaceId: string;
}

/** Acknowledgement returned to the client after a `workspace:join` attempt. */
export type WorkspaceJoinResult = { ok: true } | { ok: false; error: string };

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
  'workspace:member:added': (payload: WorkspaceMemberEvent) => void;
  'workspace:member:updated': (payload: WorkspaceMemberEvent) => void;
  'workspace:member:removed': (payload: WorkspaceMemberRemovedEvent) => void;
  'notification:created': (payload: NotificationCreatedEvent) => void;
}

/** Events clients emit to the server. */
export interface ClientToServerEvents {
  ping: (payload: PingPayload) => void;
  'board:join': (payload: BoardJoinPayload, ack: (result: BoardJoinResult) => void) => void;
  'board:leave': (payload: BoardLeavePayload) => void;
  'board:presence:editing': (payload: PresenceEditingPayload) => void;
  'workspace:join': (payload: WorkspaceJoinPayload, ack: (result: WorkspaceJoinResult) => void) => void;
  'workspace:leave': (payload: WorkspaceLeavePayload) => void;
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
