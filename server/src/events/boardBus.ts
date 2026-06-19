import { EventEmitter } from 'node:events';
import type {
  ActivityCreatedEvent,
  CardDeletedEvent,
  CardEvent,
  CardMovedEvent,
  ColumnDeletedEvent,
  ColumnEvent,
  CommentDeletedEvent,
  CommentEvent,
} from '@taskflow/shared';

/**
 * Domain events published by the service layer after a successful board
 * mutation. The socket layer subscribes and fans them out to the board room.
 *
 * This bus decouples services from Socket.IO: services have no dependency on the
 * realtime transport (so they stay trivially unit-testable), and the socket
 * layer is the single place that knows about rooms and broadcasting.
 */
export interface BoardBusEventMap {
  'card:created': CardEvent;
  'card:updated': CardEvent;
  'card:moved': CardMovedEvent;
  'card:deleted': CardDeletedEvent;
  'column:created': ColumnEvent;
  'column:updated': ColumnEvent;
  'column:deleted': ColumnDeletedEvent;
  'comment:created': CommentEvent;
  'comment:deleted': CommentDeletedEvent;
  'activity:created': ActivityCreatedEvent;
}

type BoardBusEventName = keyof BoardBusEventMap;

class BoardBus extends EventEmitter {
  constructor() {
    super();
    // Each socket server binds one listener per event; in tests a fresh server
    // may be created per file. Lift the default 10-listener cap to avoid noisy
    // (and here, meaningless) MaxListenersExceeded warnings.
    this.setMaxListeners(0);
  }

  publish<E extends BoardBusEventName>(event: E, payload: BoardBusEventMap[E]): void {
    this.emit(event, payload);
  }

  /** Subscribe to an event; returns an unsubscribe function. */
  subscribe<E extends BoardBusEventName>(
    event: E,
    listener: (payload: BoardBusEventMap[E]) => void,
  ): () => void {
    this.on(event, listener as (payload: unknown) => void);
    return () => this.off(event, listener as (payload: unknown) => void);
  }
}

/** Process-wide singleton board event bus. */
export const boardBus = new BoardBus();
