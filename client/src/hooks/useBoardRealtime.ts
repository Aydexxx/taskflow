import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ActivityCreatedEvent,
  CardDeletedEvent,
  CardEvent,
  CardMovedEvent,
  ColumnDeletedEvent,
  ColumnEvent,
  PresenceSyncEvent,
  PresenceUser,
} from '@taskflow/shared';
import { SOCKET_EVENTS } from '@taskflow/shared';
import { socket } from '../lib/socket';
import {
  applyCardDelete,
  applyCardUpsert,
  applyColumnDelete,
  applyColumnUpsert,
} from '../lib/board/boardEvents';
import type { ColumnWithCards } from '../lib/board/reorder';

type ColumnsReducer = (columns: ColumnWithCards[]) => ColumnWithCards[];

interface UseBoardRealtimeParams {
  boardId: string | undefined;
  /** Apply a pure reducer to the board's column state (no-op when not loaded yet). */
  applyEvent: (reducer: ColumnsReducer) => void;
  /** Refetch authoritative board state — called after a reconnect to catch missed events. */
  resync: () => void;
  /** A new entry was appended to the board's activity feed. */
  onActivityCreated?: (event: ActivityCreatedEvent) => void;
}

interface UseBoardRealtimeResult {
  presence: PresenceUser[];
  isConnected: boolean;
  /** Tell collaborators which card the local user is editing (or null when they stop). */
  announceEditing: (cardId: string | null) => void;
}

/**
 * Subscribe a board view to the realtime channel: join the board's room, apply
 * incoming mutation broadcasts to local state, track presence, and resync after
 * a reconnect. Listeners and room membership are torn down on unmount/navigate.
 */
export function useBoardRealtime({
  boardId,
  applyEvent,
  resync,
  onActivityCreated,
}: UseBoardRealtimeParams): UseBoardRealtimeResult {
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);

  // Keep the latest callbacks in refs so the socket effect can stay keyed only
  // on boardId (re-subscribing on every render would thrash the room).
  const applyEventRef = useRef(applyEvent);
  const resyncRef = useRef(resync);
  const onActivityCreatedRef = useRef(onActivityCreated);
  applyEventRef.current = applyEvent;
  resyncRef.current = resync;
  onActivityCreatedRef.current = onActivityCreated;

  useEffect(() => {
    if (!boardId) return;

    // Whether we've already completed an initial join. A later `connect` then
    // signals a *reconnect*, where we must resync to recover missed mutations.
    let hasJoined = false;

    const join = (): void => {
      socket.emit(SOCKET_EVENTS.BOARD_JOIN, { boardId }, (result) => {
        if (!result.ok) {
          // eslint-disable-next-line no-console
          console.error(`[board] join rejected: ${result.error}`);
          return;
        }
        if (hasJoined) resyncRef.current();
        hasJoined = true;
      });
    };

    const onConnect = (): void => {
      setIsConnected(true);
      join();
    };
    const onDisconnect = (): void => setIsConnected(false);

    const onCardCreated = (p: CardEvent): void => {
      if (p.boardId === boardId) applyEventRef.current((columns) => applyCardUpsert(columns, p.card));
    };
    const onCardUpdated = (p: CardEvent): void => {
      if (p.boardId === boardId) applyEventRef.current((columns) => applyCardUpsert(columns, p.card));
    };
    const onCardMoved = (p: CardMovedEvent): void => {
      if (p.boardId === boardId) applyEventRef.current((columns) => applyCardUpsert(columns, p.card));
    };
    const onCardDeleted = (p: CardDeletedEvent): void => {
      if (p.boardId === boardId) applyEventRef.current((columns) => applyCardDelete(columns, p.cardId));
    };
    const onColumnCreated = (p: ColumnEvent): void => {
      if (p.boardId === boardId) applyEventRef.current((columns) => applyColumnUpsert(columns, p.column));
    };
    const onColumnUpdated = (p: ColumnEvent): void => {
      if (p.boardId === boardId) applyEventRef.current((columns) => applyColumnUpsert(columns, p.column));
    };
    const onColumnDeleted = (p: ColumnDeletedEvent): void => {
      if (p.boardId === boardId) applyEventRef.current((columns) => applyColumnDelete(columns, p.columnId));
    };
    const onPresence = (p: PresenceSyncEvent): void => {
      if (p.boardId === boardId) setPresence(p.users);
    };
    const onActivityCreated = (p: ActivityCreatedEvent): void => {
      if (p.boardId === boardId) onActivityCreatedRef.current?.(p);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SOCKET_EVENTS.CARD_CREATED, onCardCreated);
    socket.on(SOCKET_EVENTS.CARD_UPDATED, onCardUpdated);
    socket.on(SOCKET_EVENTS.CARD_MOVED, onCardMoved);
    socket.on(SOCKET_EVENTS.CARD_DELETED, onCardDeleted);
    socket.on(SOCKET_EVENTS.COLUMN_CREATED, onColumnCreated);
    socket.on(SOCKET_EVENTS.COLUMN_UPDATED, onColumnUpdated);
    socket.on(SOCKET_EVENTS.COLUMN_DELETED, onColumnDeleted);
    socket.on(SOCKET_EVENTS.PRESENCE_SYNC, onPresence);
    socket.on(SOCKET_EVENTS.ACTIVITY_CREATED, onActivityCreated);

    // If the socket is already connected (the common case — AuthContext connects
    // on login), join right away; otherwise `onConnect` will fire the join.
    if (socket.connected) join();

    return () => {
      socket.emit(SOCKET_EVENTS.BOARD_LEAVE, { boardId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.CARD_CREATED, onCardCreated);
      socket.off(SOCKET_EVENTS.CARD_UPDATED, onCardUpdated);
      socket.off(SOCKET_EVENTS.CARD_MOVED, onCardMoved);
      socket.off(SOCKET_EVENTS.CARD_DELETED, onCardDeleted);
      socket.off(SOCKET_EVENTS.COLUMN_CREATED, onColumnCreated);
      socket.off(SOCKET_EVENTS.COLUMN_UPDATED, onColumnUpdated);
      socket.off(SOCKET_EVENTS.COLUMN_DELETED, onColumnDeleted);
      socket.off(SOCKET_EVENTS.PRESENCE_SYNC, onPresence);
      socket.off(SOCKET_EVENTS.ACTIVITY_CREATED, onActivityCreated);
      setPresence([]);
    };
  }, [boardId]);

  const announceEditing = useCallback(
    (cardId: string | null): void => {
      if (boardId) socket.emit(SOCKET_EVENTS.PRESENCE_EDITING, { boardId, cardId });
    },
    [boardId],
  );

  return { presence, isConnected, announceEditing };
}
