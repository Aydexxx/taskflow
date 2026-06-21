import { EventEmitter } from 'node:events';
import type { WorkspaceMemberEvent, WorkspaceMemberRemovedEvent } from '@taskflow/shared';

/**
 * Domain events published by the service layer after a successful membership
 * mutation. Mirrors `boardBus.ts`'s decoupling: services stay free of any
 * Socket.IO dependency, and the socket layer is the only place that knows
 * about rooms and broadcasting.
 */
export interface WorkspaceBusEventMap {
  'member:added': WorkspaceMemberEvent;
  'member:updated': WorkspaceMemberEvent;
  'member:removed': WorkspaceMemberRemovedEvent;
}

type WorkspaceBusEventName = keyof WorkspaceBusEventMap;

class WorkspaceBus extends EventEmitter {
  constructor() {
    super();
    // Each socket server binds one listener per event; in tests a fresh server
    // may be created per file. Lift the default 10-listener cap to avoid noisy
    // (and here, meaningless) MaxListenersExceeded warnings.
    this.setMaxListeners(0);
  }

  publish<E extends WorkspaceBusEventName>(event: E, payload: WorkspaceBusEventMap[E]): void {
    this.emit(event, payload);
  }

  /** Subscribe to an event; returns an unsubscribe function. */
  subscribe<E extends WorkspaceBusEventName>(
    event: E,
    listener: (payload: WorkspaceBusEventMap[E]) => void,
  ): () => void {
    this.on(event, listener as (payload: unknown) => void);
    return () => this.off(event, listener as (payload: unknown) => void);
  }
}

/** Process-wide singleton workspace event bus. */
export const workspaceBus = new WorkspaceBus();
