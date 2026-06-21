import { EventEmitter } from 'node:events';
import type { NotificationWithActor } from '@taskflow/shared';

/**
 * Domain event published by the service layer after a notification is
 * created. Mirrors `boardBus.ts`/`workspaceBus.ts`'s decoupling: the socket
 * layer is the only place that knows about rooms and broadcasting.
 */
export interface NotificationCreatedPayload {
  /** The recipient — the socket layer routes this to `userRoom(userId)` only. */
  userId: string;
  notification: NotificationWithActor;
}

export interface NotificationBusEventMap {
  'notification:created': NotificationCreatedPayload;
}

type NotificationBusEventName = keyof NotificationBusEventMap;

class NotificationBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);
  }

  publish<E extends NotificationBusEventName>(event: E, payload: NotificationBusEventMap[E]): void {
    this.emit(event, payload);
  }

  /** Subscribe to an event; returns an unsubscribe function. */
  subscribe<E extends NotificationBusEventName>(
    event: E,
    listener: (payload: NotificationBusEventMap[E]) => void,
  ): () => void {
    this.on(event, listener as (payload: unknown) => void);
    return () => this.off(event, listener as (payload: unknown) => void);
  }
}

/** Process-wide singleton notification event bus. */
export const notificationBus = new NotificationBus();
